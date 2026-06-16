# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Detox — keep instrumentation entry + EarlGrey internals so Release
# builds remain test-runnable (matches `e2e:test:android` release variant).
-keep class com.wix.detox.** { *; }
-keep class com.google.android.apps.common.testing.accessibility.framework.** { *; }
-keep class org.hamcrest.** { *; }
-keep class org.junit.** { *; }
-keep class com.devwallet.app.DetoxTest { *; }
