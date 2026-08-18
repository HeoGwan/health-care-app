package com.routinecare

import android.os.Bundle
import androidx.core.view.WindowCompat
import com.facebook.react.ReactActivity

class MainActivity : ReactActivity() {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "RoutineCareApp"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Android 15 Edge-to-Edge 지원
    WindowCompat.setDecorFitsSystemWindows(window, false)
  }
}
