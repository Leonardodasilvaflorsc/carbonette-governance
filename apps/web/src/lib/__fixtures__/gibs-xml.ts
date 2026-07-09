/**
 * Fixtures mínimas porém estruturalmente fiéis aos XMLs reais do GIBS
 * (WMTSCapabilities 1.0.0 e colormap v1.3), para teste offline dos parsers.
 */

export const CAPABILITIES_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<Capabilities xmlns="http://www.opengis.net/wmts/1.0" xmlns:ows="http://www.opengis.net/ows/1.1" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.0.0">
  <Contents>
    <Layer>
      <ows:Title xml:lang="en">Nitrogen Dioxide (Tropospheric Column)</ows:Title>
      <ows:Identifier>OMI_Nitrogen_Dioxide_Tropo_Column</ows:Identifier>
      <ows:Metadata xlink:role="http://earthdata.nasa.gov/gibs/metadata-type/colormap" xlink:href="https://gibs.earthdata.nasa.gov/colormaps/v1.0/OMI_Nitrogen_Dioxide_Tropo_Column.xml"/>
      <ows:Metadata xlink:role="http://earthdata.nasa.gov/gibs/metadata-type/colormap/1.3" xlink:href="https://gibs.earthdata.nasa.gov/colormaps/v1.3/OMI_Nitrogen_Dioxide_Tropo_Column.xml"/>
      <Dimension>
        <ows:Identifier>Time</ows:Identifier>
        <Default>2026-06-10</Default>
        <Value>2004-10-01/2026-06-10/P1D</Value>
      </Dimension>
      <TileMatrixSetLink><TileMatrixSet>GoogleMapsCompatible_Level6</TileMatrixSet></TileMatrixSetLink>
    </Layer>
    <Layer>
      <ows:Title xml:lang="en">Methane (400 hPa, Daily Day)</ows:Title>
      <ows:Identifier>AIRS_L3_Methane_400hPa_Volume_Mixing_Ratio_Daily_Day</ows:Identifier>
      <ows:Metadata xlink:role="http://earthdata.nasa.gov/gibs/metadata-type/colormap/1.3" xlink:href="https://gibs.earthdata.nasa.gov/colormaps/v1.3/AIRS_Methane_400hPa_Volume_Mixing_Ratio.xml"/>
      <Dimension>
        <ows:Identifier>Time</ows:Identifier>
        <Default>2026-06-09</Default>
        <Value>2002-09-01/2016-09-30/P1D</Value>
        <Value>2016-11-01/2026-06-09/P1D</Value>
      </Dimension>
      <TileMatrixSetLink><TileMatrixSet>GoogleMapsCompatible_Level6</TileMatrixSet></TileMatrixSetLink>
    </Layer>
    <Layer>
      <ows:Title xml:lang="en">Some Other Layer</ows:Title>
      <ows:Identifier>MODIS_Terra_Aerosol_Optical_Depth</ows:Identifier>
      <Dimension>
        <ows:Identifier>Time</ows:Identifier>
        <Value>2000-02-24/2026-06-10/P1D</Value>
      </Dimension>
    </Layer>
  </Contents>
</Capabilities>`;

export const COLORMAP_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<ColorMaps>
  <ColorMap title="No Data" units="">
    <Entries>
      <ColorMapEntry rgb="0,0,0" transparent="true" sourceValue="[0]" value="[0]" nodata="true"/>
    </Entries>
  </ColorMap>
  <ColorMap title="Nitrogen Dioxide" units="molecules/cm2">
    <Entries>
      <ColorMapEntry rgb="33,31,74" transparent="false" sourceValue="[0,7.4e+14)" value="[0,7.4e+14)"/>
      <ColorMapEntry rgb="46,72,151" transparent="false" sourceValue="[7.4e+14,1.48e+15)" value="[7.4e+14,1.48e+15)"/>
      <ColorMapEntry rgb="58,128,194" transparent="false" sourceValue="[1.48e+15,2.22e+15)" value="[1.48e+15,2.22e+15)"/>
      <ColorMapEntry rgb="121,183,134" transparent="false" sourceValue="[2.22e+15,2.96e+15)" value="[2.22e+15,2.96e+15)"/>
      <ColorMapEntry rgb="219,217,98" transparent="false" sourceValue="[2.96e+15,3.7e+15)" value="[2.96e+15,3.7e+15)"/>
      <ColorMapEntry rgb="237,128,55" transparent="false" sourceValue="[3.7e+15,4.44e+15)" value="[3.7e+15,4.44e+15)"/>
      <ColorMapEntry rgb="214,46,39" transparent="false" sourceValue="[4.44e+15,5.18e+15)" value="[4.44e+15,5.18e+15)"/>
      <ColorMapEntry rgb="138,17,21" transparent="false" sourceValue="[5.18e+15,+INF)" value="[5.18e+15,5.92e+15]"/>
    </Entries>
  </ColorMap>
</ColorMaps>`;
