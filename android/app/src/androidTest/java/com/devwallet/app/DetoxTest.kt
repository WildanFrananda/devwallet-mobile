package com.devwallet.app

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import androidx.test.rule.ActivityTestRule
import com.wix.detox.Detox
import com.wix.detox.config.DetoxConfig
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Detox bootstrap. Single host instrumentation entry that the Detox JS
 * runner attaches to. Do not add normal androidx instrumented tests next
 * to this — Detox owns the activity lifecycle for the whole run.
 */
@RunWith(AndroidJUnit4::class)
@LargeTest
class DetoxTest {
    @get:Rule
    val activityRule = ActivityTestRule(MainActivity::class.java, false, false)

    @Test
    fun runDetoxTests() {
        val config = DetoxConfig()
        config.idlePolicyConfig.masterTimeoutSec = 90
        config.idlePolicyConfig.idleResourceTimeoutSec = 60
        config.rnContextLoadTimeoutSec = if (BuildConfig.DEBUG) 180 else 60
        Detox.runTests(activityRule, config)
    }
}
