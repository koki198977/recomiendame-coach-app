import Foundation
import WidgetKit

@objc(WidgetBridge)
class WidgetBridge: NSObject {

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }

  /// Recarga todos los timelines de widgets para que se actualicen con los datos más recientes
  @objc
  func reloadAllTimelines() {
    if #available(iOS 14.0, *) {
      DispatchQueue.main.async {
        WidgetCenter.shared.reloadAllTimelines()
        print("✅ [WidgetBridge] reloadAllTimelines() ejecutado en el hilo principal")
      }
    }
  }
}
