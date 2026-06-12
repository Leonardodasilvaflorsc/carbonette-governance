import { beforeEach, describe, expect, it } from "vitest";
import { GIBS_LAYERS, GLOBE_PRESETS, gibsDefaultDateFor } from "@orbital/shared";
import { useGlobeStore, type LayersMeta } from "./globeStore";

const initial = useGlobeStore.getState();

beforeEach(() => {
  useGlobeStore.setState(initial, true);
});

describe("globeStore", () => {
  it("inicia com NO₂ do dia anterior (critério de aceite da FASE 1)", () => {
    const { gasKey, date } = useGlobeStore.getState();
    expect(gasKey).toBe("NO2");
    expect(date).toBe(gibsDefaultDateFor(GIBS_LAYERS.NO2));
  });

  it("trocar para gás mensal recalcula a data para o dia 01", () => {
    useGlobeStore.getState().setGas("CH4");
    const { date } = useGlobeStore.getState();
    expect(date.endsWith("-01")).toBe(true);
    expect(date).toBe(gibsDefaultDateFor(GIBS_LAYERS.CH4));
  });

  it("descoberta de camadas limita datas ao intervalo real do produto", () => {
    const meta: LayersMeta = {
      NO2: {
        ...GIBS_LAYERS.NO2,
        key: "NO2",
        available: true,
        startDate: "2004-10-01",
        endDate: "2026-06-01",
        source: "capabilities",
      },
    };
    useGlobeStore.getState().setDate("2026-06-09");
    useGlobeStore.getState().setLayersMeta(meta, "capabilities");
    expect(useGlobeStore.getState().date).toBe("2026-06-01");

    useGlobeStore.getState().setDate("1999-01-01");
    expect(useGlobeStore.getState().date).toBe("2004-10-01");
  });

  it("preset aplica gás e dispara alvo de câmera", () => {
    const preset = GLOBE_PRESETS.find((p) => p.id === "permian-basin")!;
    useGlobeStore.getState().applyPreset(preset);
    const { gasKey, cameraTarget } = useGlobeStore.getState();
    expect(gasKey).toBe("CH4");
    expect(cameraTarget?.center).toEqual(preset.center);
    expect(cameraTarget?.zoom).toBe(preset.zoom);
  });

  it("flyTo incrementa o nonce para reanimar destinos repetidos", () => {
    useGlobeStore.getState().flyTo([-48.85, -26.3], 9);
    const first = useGlobeStore.getState().cameraTarget!.nonce;
    useGlobeStore.getState().flyTo([-48.85, -26.3], 9);
    expect(useGlobeStore.getState().cameraTarget!.nonce).toBe(first + 1);
  });
});
