
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { getYtDlp } from '@/lib/yt-dlp';

/**
 * Sovereign Audio Proxy v1.3 - WebM/Opus Resiliency Edition
 * Pipes raw audio from YouTube via yt-dlp forced to WebM container.
 * This fixes "Format Error (Code 4)" as WebM is optimized for stream-start.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('id');

  if (!videoId || !/^[\w-]{11}$/.test(videoId)) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  try {
    const ytBin = await getYtDlp(); // installs yt-dlp on first use if it isn't available
    let ytProcess: ReturnType<typeof spawn> | null = null;
    let closed = false;
    const stream = new ReadableStream({
      start(controller) {
        // yt-dlp optimized for direct binary audio piping with browser spoofing
        // Forced to webm/opus for maximum decoder stability in browsers
        const proc = spawn(ytBin, [
          '--user-agent', userAgent,
          '--no-check-certificates',
          '--quiet',
          '--no-warnings',
          '--no-playlist',
          '-f', 'bestaudio[ext=webm]/bestaudio/best',
          '--buffer-size', '16K',
          '-o', '-',
          videoUrl
        ]);

        ytProcess = proc;
        // the listener closing the tab ends the stream: never touch the controller after that
        proc.stdout?.on('data', (chunk) => {
          if (!closed) try { controller.enqueue(chunk); } catch { closed = true; }
        });

        proc.stderr?.on('data', (data) => {
          const errMessage = data.toString();
          if (errMessage.includes('ERROR')) {
            console.error(`[Sovereign Proxy Engine Error]: ${errMessage}`);
          }
        });

        proc.on('close', () => {
          if (!closed) { closed = true; try { controller.close(); } catch {} }
        });

        proc.on('error', (err) => {
          console.error(`Failed to start yt-dlp process: ${err}`);
          if (!closed) { closed = true; try { controller.error(err); } catch {} }
        });

        req.signal.addEventListener('abort', () => {
          closed = true;
          proc.kill('SIGKILL');
        });
      },
      cancel() {
        closed = true;
        ytProcess?.kill('SIGKILL');
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'audio/webm',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
        'Transfer-Encoding': 'chunked'
      },
    });
  } catch (error) {
    console.error('Audio Stream API Error:', error);
    return NextResponse.json({ error: 'FAILED_TO_STREAM', videoId }, { status: 500 });
  }
}
