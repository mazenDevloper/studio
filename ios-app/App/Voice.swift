import AVFoundation
import Speech
import UIKit

/**
 The phone's voice commands (the microphone of the controls widget and of the site): listens in Arabic, shows what
 it hears, and hands the sentence to the page (the same commands as the site's microphone: matches, azkar, or play
 / search anything in the media screen).
 */
final class VoiceController: UIViewController {
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "ar-SA"))
    private let label = UILabel()
    private let heard = UILabel()
    private var silence: Timer?
    private var finished = false
    private var text = ""

    static func present() {
        guard let root = UIApplication.shared.connectedScenes.compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first?.rootViewController
                ?? (UIApplication.shared.delegate as? AppDelegate)?.window?.rootViewController else { return }
        var top = root
        while let p = top.presentedViewController { top = p }
        if top is VoiceController { return }
        let v = VoiceController()
        v.modalPresentationStyle = .overFullScreen
        v.modalTransitionStyle = .crossDissolve
        top.present(v, animated: true)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.72)
        let card = UIView()
        card.backgroundColor = UIColor(white: 0.07, alpha: 0.96)
        card.layer.cornerRadius = 28
        card.layer.borderWidth = 1
        card.layer.borderColor = UIColor(red: 0.2, green: 0.83, blue: 0.6, alpha: 0.5).cgColor
        let mic = UILabel()
        mic.text = "🎤"
        mic.font = .systemFont(ofSize: 54)
        label.text = "تحدّث الآن…"
        label.font = .systemFont(ofSize: 20, weight: .heavy)
        label.textColor = UIColor(red: 0.2, green: 0.83, blue: 0.6, alpha: 1)
        heard.font = .systemFont(ofSize: 22, weight: .bold)
        heard.textColor = .white
        heard.numberOfLines = 3
        heard.textAlignment = .center
        let hint = UILabel()
        hint.text = "مثال: «شغّل ياسر الدوسري» · «المباريات» · «الأذكار»"
        hint.font = .systemFont(ofSize: 12, weight: .semibold)
        hint.textColor = UIColor(white: 1, alpha: 0.4)
        hint.numberOfLines = 2
        hint.textAlignment = .center
        let stack = UIStackView(arrangedSubviews: [mic, label, heard, hint])
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 12
        stack.translatesAutoresizingMaskIntoConstraints = false
        card.translatesAutoresizingMaskIntoConstraints = false
        card.addSubview(stack)
        view.addSubview(card)
        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            card.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.86),
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 26),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -26),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
        ])
        view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(tapped)))
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        SFSpeechRecognizer.requestAuthorization { st in
            DispatchQueue.main.async {
                guard st == .authorized else { self.fail("اسمح بالتعرّف على الكلام من إعدادات التطبيق"); return }
                AVAudioSession.sharedInstance().requestRecordPermission { ok in
                    DispatchQueue.main.async { ok ? self.start() : self.fail("اسمح للتطبيق باستخدام المايكروفون من الإعدادات") }
                }
            }
        }
    }

    @objc private func tapped() {
        // a tap: done talking (what was heard is used), or close when nothing was heard
        text.isEmpty ? close() : finish()
    }

    private func start() {
        guard let recognizer, recognizer.isAvailable else { fail("التعرّف على الكلام غير متاح الآن"); return }
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker, .allowBluetooth])
        try? s.setActive(true, options: .notifyOthersOnDeactivation)
        let r = SFSpeechAudioBufferRecognitionRequest()
        r.shouldReportPartialResults = true
        request = r
        let input = engine.inputNode
        let fmt = input.outputFormat(forBus: 0)
        guard fmt.sampleRate > 0 else { fail("المايكروفون غير متاح"); return }
        input.installTap(onBus: 0, bufferSize: 1024, format: fmt) { [weak self] buf, _ in self?.request?.append(buf) }
        engine.prepare()
        do { try engine.start() } catch { fail("تعذّر تشغيل المايكروفون"); return }
        task = recognizer.recognitionTask(with: r) { [weak self] result, error in
            DispatchQueue.main.async {
                guard let self, !self.finished else { return }
                if let result {
                    self.text = result.bestTranscription.formattedString
                    self.heard.text = self.text
                    self.armSilence(result.isFinal ? 0.1 : 1.4)
                } else if error != nil {
                    self.text.isEmpty ? self.fail("لم أسمع شيئاً") : self.finish()
                }
            }
        }
        armSilence(7) // nothing said: stop after a while
    }

    private func armSilence(_ s: TimeInterval) {
        silence?.invalidate()
        silence = Timer.scheduledTimer(withTimeInterval: s, repeats: false) { [weak self] _ in
            guard let self else { return }
            self.text.isEmpty ? self.fail("لم أسمع شيئاً") : self.finish()
        }
    }

    private func stopAudio() {
        silence?.invalidate()
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio()
        task?.cancel()
        // back to playing media (the app's usual audio)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .default, options: [])
        try? AVAudioSession.sharedInstance().setActive(true)
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        stopAudio()
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        label.text = "✓"
        dismiss(animated: true) {
            if !t.isEmpty { Bridge.shared.voiceCommand(t) }
        }
    }

    private func fail(_ msg: String) {
        guard !finished else { return }
        finished = true
        stopAudio()
        label.text = msg
        label.textColor = UIColor(red: 0.98, green: 0.45, blue: 0.45, alpha: 1)
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.6) { self.dismiss(animated: true) }
    }

    private func close() {
        finished = true
        stopAudio()
        dismiss(animated: true)
    }
}

/// A short message at the top of the screen.
enum Toast {
    static func show(_ text: String) {
        guard let w = UIApplication.shared.connectedScenes.compactMap({ ($0 as? UIWindowScene)?.keyWindow }).first
                ?? (UIApplication.shared.delegate as? AppDelegate)?.window else { return }
        let l = PaddedLabel()
        l.text = text
        l.font = .systemFont(ofSize: 16, weight: .heavy)
        l.textColor = .white
        l.backgroundColor = UIColor(white: 0.08, alpha: 0.94)
        l.layer.cornerRadius = 20
        l.layer.masksToBounds = true
        l.alpha = 0
        l.translatesAutoresizingMaskIntoConstraints = false
        w.addSubview(l)
        NSLayoutConstraint.activate([
            l.centerXAnchor.constraint(equalTo: w.centerXAnchor),
            l.topAnchor.constraint(equalTo: w.safeAreaLayoutGuide.topAnchor, constant: 12),
        ])
        UIView.animate(withDuration: 0.25) { l.alpha = 1 }
        UIView.animate(withDuration: 0.4, delay: 1.8, options: []) { l.alpha = 0 } completion: { _ in l.removeFromSuperview() }
    }

    final class PaddedLabel: UILabel {
        override func drawText(in rect: CGRect) { super.drawText(in: rect.insetBy(dx: 18, dy: 10)) }
        override var intrinsicContentSize: CGSize {
            let s = super.intrinsicContentSize
            return CGSize(width: s.width + 36, height: s.height + 20)
        }
    }
}
