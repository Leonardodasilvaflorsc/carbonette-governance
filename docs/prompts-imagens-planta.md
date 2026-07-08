# Prompts para Geração de Imagens da Planta (Nano Banana / Gemini)

Imagens fotorrealistas de cada bloco da planta para o **Tour Virtual**
(aba "Tour Virtual" do simulador, componente `PlantVirtualTour.tsx`).

## Como usar

1. Gere primeiro a **vista aérea** (`aerial`) — ela é a "âncora" visual da planta.
2. Para as demais cenas, **anexe a imagem aérea como referência** e comece o
   prompt com: *"Using the attached image as the master reference for this
   exact plant (same architecture, colors, weather and lighting), generate…"*.
   Isso mantém a consistência entre as cenas.
3. Formato: **16:9** (ideal 1920×1080 ou maior).
4. Salve cada imagem em `public/plant-tour/<id>.jpg` com o nome exato indicado.
5. Recarregue o app — o tour detecta as imagens automaticamente.

## Bloco de estilo global (cole no FINAL de todos os prompts)

> Ultra-realistic industrial photography, modern green ammonia fertilizer
> plant, clean high-tech aesthetic, light-gray and teal painted steel
> structures, safety-yellow handrails and ladders, stainless steel piping with
> orange flow-direction arrows, concrete paving with painted walkways, soft
> overcast daylight with mild shadows, slight atmospheric haze in the
> background, wide-angle 24mm lens at eye level unless stated otherwise,
> photorealistic, 8k detail, no people unless stated, no text or watermarks,
> 16:9 aspect ratio.

---

## 1. `aerial.jpg` — Vista aérea geral (gerar PRIMEIRO)

> Aerial drone photograph at 45 degrees of a complete modern green ammonia
> fertilizer plant on a flat industrial site of about 7 hectares. Layout
> clearly organized in areas connected by elevated steel pipe racks: on the
> left, a long rectangular electrolyzer building with rows of rooftop HVAC and
> three large rectifier transformer bays; below it, a cryogenic air separation
> unit with two tall distillation columns and a boxy cold box; in the center, a
> compressor house with an overhead crane hall; to its right, the ammonia
> synthesis area with one tall thick-walled reactor vessel, a waste-heat boiler
> and heat exchangers on steel structures; far right, a large white
> double-walled refrigerated ammonia storage tank inside a concrete containment
> dike, plus truck loading bays; top right corner, a high-voltage substation
> switchyard and a cooling tower with faint vapor plume; a slim flare stack
> with a small pilot flame stands behind the synthesis area; internal asphalt
> roads with white markings, small administration building with control room at
> the bottom left. + [BLOCO DE ESTILO]

## 2. `electrolysis.jpg` — Área 100, Geração de H₂ (eletrólise)

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: interior-exterior view
> at eye level of the electrolyzer building, large industrial hall with three
> rows of modular PEM electrolyzer skids in light-gray enclosures with teal
> accents, stainless steel hydrogen piping with green H2 labels rising to a
> pipe rack, DC busbars and rectifier cabinets along the wall, demineralized
> water treatment skids in the foreground, glossy sealed concrete floor with
> yellow walkway markings, LED high-bay lighting. + [BLOCO DE ESTILO]

*Variante SMR (se a rota for gás natural):* substituir por "steam methane
reformer furnace, a tall rectangular firebox with rows of external burners,
convection section ducting, shift converters and a PSA unit with multiple
vertical adsorber vessels".

## 3. `asu.jpg` — Área 200, Separação de Ar (N₂)

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: ground-level view of
> the cryogenic air separation unit, one tall slender distillation column pair
> wrapped in polished aluminum cladding, a large rectangular insulated cold box
> with frost lines near valve penetrations, main air compressor intake filter
> house, a small liquid-nitrogen storage tank with visible cold vapor, blue N2
> labeled piping running to the pipe rack. + [BLOCO DE ESTILO]

## 4. `compression.jpg` — Área 300, Casa de Compressores

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: inside the compressor
> hall, a large centrifugal syngas compressor train on a massive concrete
> foundation, barrel-type casing painted teal with polished steel piping,
> coupling guards in safety yellow, an overhead traveling crane under the roof
> trusses, lube-oil console with gauges in the foreground, local control panel
> with illuminated indicators, epoxy floor. + [BLOCO DE ESTILO]

## 5. `synthesis.jpg` — Área 400, Loop de Síntese Haber-Bosch

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: dramatic low-angle
> view of the ammonia synthesis converter, a very tall thick-walled cylindrical
> pressure vessel with heavy bolted closure and multiple nozzles, surrounded by
> a multi-level steel access structure with stairs and platforms, adjacent
> waste-heat boiler drum and vertical heat exchangers, dense high-pressure
> piping with insulation jackets, steam lines with silver lagging rising to a
> pipe bridge. + [BLOCO DE ESTILO]

## 6. `chiller.jpg` — Área 400, Condensação e Separação

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: refrigeration and
> separation section, horizontal ammonia chiller shell-and-tube exchangers with
> frost on the coldest lines, a vertical high-pressure separator drum on a
> skirt with level gauges, ammonia refrigeration compressor package nearby,
> insulated cold piping with white jacketing and ice buildup at supports, red
> NH3 labeled product line leaving the unit. + [BLOCO DE ESTILO]

## 7. `urea.jpg` — Área 600, Planta de Ureia (se produto = ureia)

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: urea synthesis and
> granulation unit, a tall stainless steel high-pressure urea reactor and
> stripper column pair on a concrete structure, CO2 compressor house at grade,
> a large fluidized-bed granulator building with dust scrubber stack emitting
> faint white vapor, an enclosed conveyor gallery rising to a product storage
> dome, bags of white granular urea on pallets near the loading bay.
> + [BLOCO DE ESTILO]

## 8. `tank-farm.jpg` — Área 500, Tancagem e Expedição

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: the refrigerated
> ammonia storage area, one large white double-walled cryogenic tank about 40
> meters diameter with external stair spiral and top platform, inside a
> concrete containment dike, boil-off gas compressor skid beside it, truck
> loading gantry with two tanker trucks and loading arms, blue-and-white safety
> signage reading generic hazard pictograms (no readable text). + [BLOCO DE ESTILO]

## 9. `substation.jpg` — Subestação Principal SE-01

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: outdoor high-voltage
> substation switchyard, gantry steel structures with strain insulators, two
> large power transformers with radiator banks and conservator tanks, gravel
> ground with cable trenches, a prefabricated electrical house with rows of
> medium-voltage switchgear visible through open door, transmission line
> towers approaching from the distance. + [BLOCO DE ESTILO]

## 10. `cooling.jpg` — Utilidades / Torre de Resfriamento

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: utilities area with a
> three-cell induced-draft cooling tower with visible vapor plumes, large
> circulating water pumps on concrete pads with teal casings, a water treatment
> building with clarifier tank, air compressor package and instrument-air
> dryers under a canopy. + [BLOCO DE ESTILO]

## 11. `control-room.jpg` — Sala de Controle (COI)

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: modern plant central
> control room interior, curved operator console desks with multiple monitors
> showing colorful process graphics (abstract, no readable text), a large
> video wall displaying a plant overview schematic, ergonomic chairs, soft
> indirect lighting, two operators seen from behind, glass wall to a meeting
> room. + [BLOCO DE ESTILO — ajustar: interior, 35mm lens]

## 12. `flare.jpg` — Flare / Segurança

> Using the attached image as the master reference for this exact plant (same
> architecture, colors, weather and lighting), generate: tall slim flare stack
> seen from grade against the overcast sky, small steady pilot flame at the
> tip, guy wires, knock-out drum and molecular seal at the base inside a gravel
> radiation exclusion zone with warning signs (no readable text), plant
> structures softly out of focus in the background. + [BLOCO DE ESTILO]

---

## Dicas de consistência no Nano Banana

- **Sempre anexe a vista aérea** como referência ao gerar as demais cenas —
  é o mecanismo mais eficaz para manter cores, clima e arquitetura idênticos.
- Se uma cena vier com estilo divergente, peça: *"regenerate keeping exactly
  the same color palette, weather and architecture as the attached reference"*.
- Para variações da mesma cena (ângulos), gere a partir da imagem da própria
  cena: *"same location, camera rotated 90 degrees to the right"*.
- Evite texto legível em placas (a IA distorce texto): os prompts já pedem
  "no readable text".
- Se quiser noite/entardecer para uma versão alternativa do tour, troque o
  trecho de iluminação do bloco global em TODAS as cenas de uma vez
  (ex.: *"blue hour dusk, warm sodium and white LED floodlights"*).
