import AVFoundation
import UIKit

/**
 Keeps the app running behind other apps / with the screen locked while an island is shown, so it can move the
 island on by itself (adhan → iqamah → next prayer, fresh match scores). iOS only lets an app update its Live
 Activity while it runs (without Apple's push, which needs a paid account): an app playing sound keeps running, so a
 silent sound plays, mixed with the other apps' audio (it never stops your music). The page's own media, when it
 plays, does the same job and this stays off.
 */
final class KeepAlive {
    static let shared = KeepAlive()
    private var player: AVAudioPlayer?
    /// the page is playing a video / audio / channel (it keeps the app running itself)
    var pageMedia = false

    private init() {
        NotificationCenter.default.addObserver(forName: AVAudioSession.interruptionNotification, object: nil, queue: .main) { [weak self] n in
            // a call / Siri stopped the sound: start again afterwards
            guard let raw = n.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  AVAudioSession.InterruptionType(rawValue: raw) == .ended, let self, self.player != nil else { return }
            self.player?.play()
        }
    }

    var enabled: Bool {
        UserDefaults.standard.object(forKey: "keepAlive") as? Bool ?? true
    }

    /// the app went behind: keep it running when an island needs it
    func enterBackground() {
        guard enabled, !pageMedia, Island.shared.needsKeepAlive else { return }
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try? s.setActive(true)
        if player == nil {
            player = try? AVAudioPlayer(data: Self.silence)
            player?.numberOfLoops = -1
            player?.volume = 0
        }
        player?.play()
    }

    /// back in front: the app's normal audio (the page's media gets the lock-screen controls again)
    func enterForeground() {
        guard player != nil else { return }
        player?.stop()
        player = nil
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    /// nothing left to show (islands hidden / off): let iOS suspend the app
    func stopIfIdle() {
        guard player != nil, !Island.shared.needsKeepAlive, UIApplication.shared.applicationState != .active else { return }
        player?.stop()
        player = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    /// one second of silence (8 kHz, 16-bit mono WAV)
    private static let silence: Data = {
        let rate: UInt32 = 8000, samples = rate
        var d = Data()
        func u32(_ v: UInt32) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 4)) }
        func u16(_ v: UInt16) { var x = v.littleEndian; d.append(Data(bytes: &x, count: 2)) }
        d.append("RIFF".data(using: .ascii)!); u32(36 + samples * 2)
        d.append("WAVE".data(using: .ascii)!)
        d.append("fmt ".data(using: .ascii)!); u32(16); u16(1); u16(1); u32(rate); u32(rate * 2); u16(2); u16(16)
        d.append("data".data(using: .ascii)!); u32(samples * 2)
        d.append(Data(count: Int(samples * 2)))
        return d
    }()
}
