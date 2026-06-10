package cloud.mirlab.procura;

import android.graphics.Color;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Fond du WebView = couleur du theme (au lieu du blanc par defaut) :
        // evite le flash blanc avant le rendu de l'interface React.
        try {
            if (this.bridge != null && this.bridge.getWebView() != null) {
                this.bridge.getWebView().setBackgroundColor(Color.parseColor("#e0e5ec"));
            }
        } catch (Exception ignored) {}
    }
}
