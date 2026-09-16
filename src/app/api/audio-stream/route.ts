
import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';

/**
 * Sovereign Audio Proxy v1.3 - WebM/Opus Resiliency Edition
 * Pipes raw audio from YouTube via yt-dlp forced to WebM container.
 * This fixes "Format Error (Code 4)" as WebM is optimized for stream-start.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get('id');

  if (!videoId) {
    return NextResponse.json({ error: 'Video ID is required' }, { status: 400 });
  }

  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

  try {
    const stream = new ReadableStream({
      start(controller) {
        // yt-dlp optimized for direct binary audio piping with browser spoofing
        // Forced to webm/opus for maximum decoder stability in browsers
        const ytProcess = spawn('yt-dlp', [
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

        ytProcess.stdout.on('data', (chunk) => {
          controller.enqueue(chunk);
        });

        ytProcess.stderr.on('data', (data) => {
          const errMessage = data.toString();
          if (errMessage.includes('ERROR')) {
            console.error(`[Sovereign Proxy Engine Error]: ${errMessage}`);
          }
        });

        ytProcess.on('close', (code) => {
          controller.close();
        });

        ytProcess.on('error', (err) => {
          console.error(`Failed to start yt-dlp process: ${err}`);
          controller.error(err);
        });

        req.signal.addEventListener('abort', () => {
          ytProcess.kill('SIGKILL');
        });
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'audio/webm',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
        'X-Content-Type-Options': 'nosniff',
        'Transfer-Encoding': 'chunked'
      },
    });
  } catch (error) {
    console.error('Audio Stream API Error:', error);
    return NextResponse.json({ error: 'FAILED_TO_STREAM', videoId }, { status: 500 });
  }
}
