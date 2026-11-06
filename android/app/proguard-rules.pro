# Capacitor Bridge & Plugins
-keep class com.getcapacitor.BridgeActivity
-keep class com.getcapacitor.Bridge
-keep class * extends com.getcapacitor.Plugin { *; }

# Keep JavaScript Interfaces used by WebView
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep Cordova plugins
-keep class org.apache.cordova.** { *; }

# Keep Google Play Services & AdMob & Social Login
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
-keep class ee.forgr.capacitor.social.login.** { *; }

# Preserve stack trace line numbers and annotations
-keepattributes SourceFile,LineNumberTable,Signature,*Annotation*,InnerClasses,EnclosingMethod
