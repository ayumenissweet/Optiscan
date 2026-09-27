import { useEffect, useState } from "react";
import { getApiBase } from "../api";

enum SettingOptions {
  CLIENT = "add-client",
  DATE = "add-date",
}

interface SettingsData {
  [SettingOptions.CLIENT]?: boolean;
  [SettingOptions.DATE]?: boolean;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>({
    [SettingOptions.CLIENT]: false,
    [SettingOptions.DATE]: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${getApiBase()}/settings`);

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const rows: { id: string; key: SettingOptions; value: boolean }[] =
          await res.json();

        const settingsData: SettingsData = {};
        for (const row of rows) {
          settingsData[row.key] = row.value;
        }

        setSettings({
          [SettingOptions.CLIENT]: !!settingsData[SettingOptions.CLIENT],
          [SettingOptions.DATE]: !!settingsData[SettingOptions.DATE],
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load settings",
        );
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const toggle = (key: SettingOptions) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`${getApiBase()}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: settings }),
      });

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full px-6 py-10"
      style={{ backgroundColor: "var(--color-bg)" }}
    >
      <div className="mx-auto max-w-2xl">
        <h1
          className="mb-6 text-2xl font-semibold"
          style={{ color: "var(--color-text)" }}
        >
          Settings
        </h1>

        <div
          className="rounded-xl border p-6"
          style={{
            backgroundColor: "var(--color-card)",
            borderColor: "var(--color-stroke)",
          }}
        >
          {loading ? (
            <p
              className="text-sm"
              style={{ color: "var(--color-placeholder)" }}
            >
              Loading settings...
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Add clients */}
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!settings[SettingOptions.CLIENT]}
                    onChange={() => toggle(SettingOptions.CLIENT)}
                    className="mt-1 h-4 w-4 rounded"
                    style={{ accentColor: "var(--color-accent-1)" }}
                  />
                  <div>
                    <p
                      className="font-medium"
                      style={{ color: "var(--color-text)" }}
                    >
                      Add clients
                    </p>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--color-placeholder)" }}
                    >
                      Add clients into the exported excel.
                    </p>
                  </div>
                </label>

                {/* Add date */}
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={!!settings[SettingOptions.DATE]}
                    onChange={() => toggle(SettingOptions.DATE)}
                    className="mt-1 h-4 w-4 rounded"
                    style={{ accentColor: "var(--color-accent-2)" }}
                  />
                  <div>
                    <p
                      className="font-medium"
                      style={{ color: "var(--color-text)" }}
                    >
                      Add date
                    </p>
                    <p
                      className="mt-1 text-sm"
                      style={{ color: "var(--color-placeholder)" }}
                    >
                      Add date into the exported excel.
                    </p>
                  </div>
                </label>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: "var(--color-accent-1)" }}
                >
                  {saving ? "Saving..." : "Save"}
                </button>

                {saved && (
                  <span
                    className="text-sm"
                    style={{ color: "var(--color-accent-1)" }}
                  >
                    Saved.
                  </span>
                )}
                {error && <span className="text-sm text-red-600">{error}</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
