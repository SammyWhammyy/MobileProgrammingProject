package expo.modules.wifiscanner

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.location.LocationManager
import android.net.wifi.ScanResult
import android.net.wifi.WifiManager
import android.os.Build
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val ScanResultsEvent = "onScanResults"

class WifiScannerModule : Module() {
  private var receiver: BroadcastReceiver? = null

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private val wifiManager: WifiManager
    get() = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager

  override fun definition() = ModuleDefinition {
    Name("WifiScanner")

    Events(ScanResultsEvent)

    OnStartObserving(ScanResultsEvent) { registerReceiver() }
    OnStopObserving(ScanResultsEvent) { unregisterReceiver() }
    OnDestroy { unregisterReceiver() }

    // Returns false when the OS rejects the request (usually scan throttling).
    Function("startScan") {
      @Suppress("DEPRECATION")
      wifiManager.startScan()
    }

    Function("getScanResults") {
      wifiManager.scanResults.map(::toMap)
    }

    Function("getStatus") {
      val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
      mapOf(
        "wifiEnabled" to wifiManager.isWifiEnabled,
        "locationEnabled" to locationManager.isLocationEnabled,
        "scanThrottleEnabled" to
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) wifiManager.isScanThrottleEnabled else null,
        "rttSupported" to context.packageManager.hasSystemFeature("android.hardware.wifi.rtt"),
        "sdkInt" to Build.VERSION.SDK_INT
      )
    }
  }

  private fun registerReceiver() {
    if (receiver != null) return
    val r = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        val updated = intent.getBooleanExtra(WifiManager.EXTRA_RESULTS_UPDATED, false)
        sendEvent(
          ScanResultsEvent,
          mapOf(
            "updated" to updated,
            "results" to wifiManager.scanResults.map(::toMap)
          )
        )
      }
    }
    val filter = IntentFilter(WifiManager.SCAN_RESULTS_AVAILABLE_ACTION)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      context.registerReceiver(r, filter, Context.RECEIVER_EXPORTED)
    } else {
      context.registerReceiver(r, filter)
    }
    receiver = r
  }

  private fun unregisterReceiver() {
    receiver?.let {
      runCatching { appContext.reactContext?.unregisterReceiver(it) }
    }
    receiver = null
  }

  private fun toMap(r: ScanResult): Map<String, Any?> {
    // ScanResult.timestamp is microseconds since boot.
    val ageMs = SystemClock.elapsedRealtime() - r.timestamp / 1000
    @Suppress("DEPRECATION")
    val ssid = r.SSID
    return mapOf(
      "bssid" to r.BSSID,
      "ssid" to ssid,
      "rssi" to r.level,
      "frequency" to r.frequency,
      "channelWidth" to r.channelWidth,
      "centerFreq0" to r.centerFreq0,
      "centerFreq1" to r.centerFreq1,
      "capabilities" to r.capabilities,
      "wifiStandard" to if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) r.wifiStandard else null,
      "is80211mcResponder" to r.is80211mcResponder,
      "ageMs" to ageMs,
      "seenAt" to System.currentTimeMillis() - ageMs
    )
  }
}
