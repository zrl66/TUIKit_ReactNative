package io.trtc.tuikit.atomicxcore.hybridapi.proxy

import android.Manifest
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.trtc.tuikit.common.foregroundservice.AudioForegroundService
import com.trtc.tuikit.common.foregroundservice.MediaForegroundService

class ForegroundServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String {
        return NAME
    }

    companion object {
        const val NAME = "ForegroundServiceModule"
    }

    @ReactMethod
    fun startForegroundService(title: String?, description: String?, promise: Promise) {
        Log.i(NAME, "startForegroundService called, title: $title, description: $description")
        mainHandler.post {
            val context = reactApplicationContext.applicationContext
            val finalTitle = title ?: ""
            val finalDescription = description ?: ""
            val icon = 0

            if (checkHasAudioPermission()) {
                AudioForegroundService.start(context, finalTitle, finalDescription, icon)
            } else {
                MediaForegroundService.start(context, finalTitle, finalDescription, icon)
            }
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun stopForegroundService(promise: Promise) {
        Log.i(NAME, "stopForegroundService called")
        mainHandler.post {
            val context = reactApplicationContext.applicationContext
            AudioForegroundService.stop(context)
            MediaForegroundService.stop(context)
            promise.resolve(true)
        }
    }

    private fun checkHasAudioPermission(): Boolean {
        val hasAudioPermission = ContextCompat.checkSelfPermission(
            reactApplicationContext,
            Manifest.permission.RECORD_AUDIO
        ) == PackageManager.PERMISSION_GRANTED
        Log.i(NAME, "checkHasAudioPermission: $hasAudioPermission")
        return hasAudioPermission
    }
}

