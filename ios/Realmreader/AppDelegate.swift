import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import FirebaseCore
import RNBootSplash   // ✅ ADD THIS

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {

    // ✅ Firebase first
    FirebaseApp.configure()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    // ✅ Start React Native
    factory.startReactNative(
      withModuleName: "Realmreader",
      in: window,
      launchOptions: launchOptions
    )

    // ✅ INIT BOOTSPLASH (VERY IMPORTANT)
    if let rootView = window?.rootViewController?.view {
      RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
    }

    return true
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
