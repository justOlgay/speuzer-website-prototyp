// Dekodiert QR-Codes aus einer Bilddatei mit dem Apple-Framework CoreImage (CIDetector) und gibt den Inhalt zeilenweise aus.
// Nur für Tests (tools/anmeldung-test/zugang-test.mjs): ein zweiter, vom Erzeuger unabhängiger Weg, den Inhalt eines QR-Codes zu lesen.
// Aufruf: qr-dekodieren <bild.png>; Exit 0, wenn mindestens ein QR-Code gefunden wurde, 1 sonst, 2 bei Fehlern.
import Foundation
import CoreImage
import AppKit

guard CommandLine.arguments.count >= 2 else { FileHandle.standardError.write("Aufruf: qr-dekodieren <bild.png>\n".data(using: .utf8)!); exit(2) }
let pfad = CommandLine.arguments[1]
guard let bild = CIImage(contentsOf: URL(fileURLWithPath: pfad)) else { FileHandle.standardError.write("Bild nicht lesbar\n".data(using: .utf8)!); exit(2) }
let detektor = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])!
let treffer = detektor.features(in: bild).compactMap { ($0 as? CIQRCodeFeature)?.messageString }
for t in treffer { print(t) }
exit(treffer.isEmpty ? 1 : 0)
