package com.drivecast.sovereign;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;

import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

/**
 * The goals the moment they happen: the server's live channel (/live, a WebSocket) pushes the new scores as soon as
 * anything moves, so the phone stops asking every few seconds. Open only while a game is live (or about to start);
 * a tiny client (no library): text frames in, pong/close out. Any trouble → closed, and the normal polling carries on.
 */
final class LiveSocket {

    interface Listener {
        void onMessage(String text);
    }

    private static final String HOST = "studio.c-p.workers.dev";
    private final Listener listener;
    private volatile boolean wanted = false;
    private volatile Socket sock;
    private volatile OutputStream out;
    private volatile long lastMessage = 0;
    private Thread thread;
    private long backoff = 2_000;
    private final SecureRandom rnd = new SecureRandom();

    LiveSocket(Listener l) {
        listener = l;
    }

    /** connected and heard from in the last two minutes (the server sends at least every 30 s while open) */
    boolean healthy() {
        return sock != null && System.currentTimeMillis() - lastMessage < 120_000;
    }

    synchronized void start() {
        if (wanted) return;
        wanted = true;
        thread = new Thread(this::loop, "live-socket");
        thread.setDaemon(true);
        thread.start();
    }

    /** the server answers "ping" with "pong" - keeps the line (and its NAT) alive between score changes */
    void ping() {
        if (sock == null) return;
        new Thread(() -> {
            try {
                send(0x1, "ping".getBytes(StandardCharsets.US_ASCII));
            } catch (Exception e) {
                closeQuietly();
            }
        }).start();
    }

    synchronized void stop() {
        wanted = false;
        closeQuietly();
    }

    private void closeQuietly() {
        Socket s = sock;
        sock = null;
        out = null;
        try {
            if (s != null) s.close();
        } catch (Exception ignored) {
        }
    }

    private void loop() {
        while (wanted) {
            try {
                run();
                backoff = 2_000;
            } catch (Exception ignored) {
            }
            closeQuietly();
            if (!wanted) break;
            try {
                Thread.sleep(backoff);
            } catch (InterruptedException e) {
                break;
            }
            backoff = Math.min(backoff * 2, 60_000);
        }
    }

    private void run() throws Exception {
        Socket raw = new Socket();
        raw.connect(new InetSocketAddress(HOST, 443), 10_000);
        SSLSocket s = (SSLSocket) ((SSLSocketFactory) SSLSocketFactory.getDefault()).createSocket(raw, HOST, 443, true);
        s.startHandshake();
        s.setSoTimeout(90_000);   // the server speaks at least every 30 s; silence = a dead line
        sock = s;
        out = s.getOutputStream();
        byte[] key = new byte[16];
        rnd.nextBytes(key);
        String req = "GET /live?lang=1 HTTP/1.1\r\nHost: " + HOST + "\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                + "Sec-WebSocket-Key: " + android.util.Base64.encodeToString(key, android.util.Base64.NO_WRAP)
                + "\r\nSec-WebSocket-Version: 13\r\nUser-Agent: DriveCast-Android\r\n\r\n";
        out.write(req.getBytes(StandardCharsets.US_ASCII));
        out.flush();
        InputStream in = new BufferedInputStream(s.getInputStream());
        String status = line(in);
        if (!status.contains(" 101")) throw new Exception("no upgrade: " + status);
        while (!line(in).isEmpty()) { /* headers */ }
        lastMessage = System.currentTimeMillis();
        ByteArrayOutputStream msg = new ByteArrayOutputStream();
        while (wanted) {
            int b0 = in.read(), b1 = in.read();
            if (b0 < 0 || b1 < 0) return;
            boolean fin = (b0 & 0x80) != 0;
            int op = b0 & 0x0F;
            long len = b1 & 0x7F;
            if (len == 126) len = (in.read() << 8) | in.read();
            else if (len == 127) {
                len = 0;
                for (int i = 0; i < 8; i++) len = (len << 8) | in.read();
            }
            if (len > 4_000_000) return;   // not ours
            byte[] mask = null;
            if ((b1 & 0x80) != 0) {
                mask = new byte[4];
                readFully(in, mask);
            }
            byte[] data = new byte[(int) len];
            readFully(in, data);
            if (mask != null) for (int i = 0; i < data.length; i++) data[i] ^= mask[i & 3];
            lastMessage = System.currentTimeMillis();
            if (op == 0x9) {
                send(0xA, data);
            } else if (op == 0x8) {
                send(0x8, new byte[0]);
                return;
            } else if (op == 0x1 || op == 0x0) {
                msg.write(data);
                if (fin) {
                    String text = msg.toString("UTF-8");
                    msg.reset();
                    if ("pong".equals(text)) continue;
                    try {
                        listener.onMessage(text);
                    } catch (Exception ignored) {
                    }
                }
            }
        }
    }

    /** a client frame (always masked) */
    private synchronized void send(int op, byte[] data) throws Exception {
        OutputStream o = out;
        if (o == null) return;
        ByteArrayOutputStream f = new ByteArrayOutputStream();
        f.write(0x80 | op);
        f.write(0x80 | data.length);   // control frames only: < 126 bytes
        byte[] m = new byte[4];
        rnd.nextBytes(m);
        f.write(m);
        for (int i = 0; i < data.length; i++) f.write(data[i] ^ m[i & 3]);
        o.write(f.toByteArray());
        o.flush();
    }

    private static void readFully(InputStream in, byte[] b) throws Exception {
        int n = 0;
        while (n < b.length) {
            int r = in.read(b, n, b.length - n);
            if (r < 0) throw new Exception("eof");
            n += r;
        }
    }

    private static String line(InputStream in) throws Exception {
        StringBuilder sb = new StringBuilder();
        int c;
        while ((c = in.read()) >= 0 && c != '\n') if (c != '\r') sb.append((char) c);
        if (c < 0 && sb.length() == 0) throw new Exception("eof");
        return sb.toString();
    }
}
