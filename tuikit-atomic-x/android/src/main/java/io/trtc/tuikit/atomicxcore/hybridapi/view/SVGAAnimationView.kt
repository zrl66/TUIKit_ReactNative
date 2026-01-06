package io.trtc.tuikit.atomicxcore.hybridapi.view

import android.content.Context
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.opensource.svgaplayer.SVGACallback
import com.opensource.svgaplayer.SVGAImageView
import com.opensource.svgaplayer.SVGAParser
import com.opensource.svgaplayer.SVGAVideoEntity
import java.io.File
import java.io.FileInputStream
import java.io.FileNotFoundException
import java.io.IOException
import java.io.InputStream
import java.net.URL

interface SVGAAnimationListener {
    fun onFinished()
}

class SVGAAnimationView(context: Context) : FrameLayout(context), SVGACallback {
    private val svgaParser: SVGAParser
    private val svgaImageView: SVGAImageView
    private var listener: SVGAAnimationListener? = null

    init {
        setClickable(false)
        setFocusable(false)
        svgaImageView = SVGAImageView(context)
        val lp: ViewGroup.LayoutParams =
            ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
        addView(svgaImageView, lp)
        svgaImageView.loops = 1
        svgaImageView.callback = this
        svgaParser = SVGAParser.shareParser()
        svgaParser.init(context)
    }

    fun setAnimationListener(listener: SVGAAnimationListener?) {
        this.listener = listener
    }

    fun startAnimation(playUrl: String) {
        Log.d(TAG, "startAnimation playUrl: $playUrl")

        if (playUrl.isNullOrEmpty()) {
            Log.e(TAG, "startAnimation, playUrl is empty")
            listener?.onFinished()
            return
        }

        if (playUrl.endsWith(".svga") && isUrl(playUrl)) {
            decodeFromURL(playUrl)
        } else {
            decodeFromInputStream(playUrl)
        }
    }

    private fun isUrl(url: String): Boolean = url.startsWith("http") || url.startsWith("https")

    fun stopAnimation() {
        svgaImageView.stopAnimation(true)
        cleanup()
    }

    private fun decodeFromURL(playUrl: String) {
        Log.d(TAG, "decodeFromURL, playUrl: $playUrl")

        svgaParser.decodeFromURL(URL(playUrl), object : SVGAParser.ParseCompletion {
            override fun onComplete(videoItem: SVGAVideoEntity) {
                Log.d(TAG, "decodeFromURL onComplete, videoItem: $videoItem")

                svgaImageView.setVisibility(View.VISIBLE)
                svgaImageView.setVideoItem(videoItem)
                svgaImageView.startAnimation()
            }

            override fun onError() {
                Log.e(TAG, "decodeFromURL failed, playUrl: $playUrl")
                listener?.onFinished()
            }
        },)
    }

    private fun decodeFromInputStream(filePath: String) {
        Log.d(TAG, "decodeFromInputStream, filePath: $filePath")
        val stream = openInputStream(filePath)
        if (stream == null) {
            Log.e(TAG, "decodeFromInputStream failed, filePath is null")
            listener?.onFinished()
            return
        }
        svgaParser.decodeFromInputStream(stream, "", object : SVGAParser.ParseCompletion {
            override fun onComplete(videoItem: SVGAVideoEntity) {
                Log.d(TAG, "decodeFromInputStream start: videoItem: $videoItem")
                try {
                    stream.close()
                } catch (e: IOException) {
                    Log.e(TAG, "Failed to close InputStream in onComplete", e)
                }
                svgaImageView.setVisibility(View.VISIBLE)
                svgaImageView.setVideoItem(videoItem)
                svgaImageView.startAnimation()
            }

            override fun onError() {
                Log.e(TAG, "decodeFromInputStream parse failed, filePath: $filePath")
                try {
                    stream.close()
                } catch (e: IOException) {
                    Log.e(TAG, "Failed to close InputStream in onError", e)
                }
                listener?.onFinished()
            }
        }, true, null, "", )
    }

    override fun onFinished() {
        Log.d(TAG, "onFinished")
        svgaImageView.setVisibility(View.GONE)
        cleanup()
        listener?.onFinished()
    }

    private fun cleanup() {
        svgaImageView.stopAnimation(true)
        svgaImageView.clear()
    }

    override fun onPause() {
    }

    override fun onRepeat() {
    }

    override fun onStep(frame: Int, percentage: Double) {
    }

    private fun openInputStream(path: String): InputStream? {
        try {
            val file = File(path)
            if (file.exists()) {
                return FileInputStream(file)
            }
        } catch (e: FileNotFoundException) {
            Log.i(TAG, " " + e.localizedMessage)
        }
        return null
    }

    companion object {
        private const val TAG = "SVGAAnimationView"
    }
}
