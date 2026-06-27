import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useResponsive } from '../../lib/responsive';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import {
  CONSTITUENCY_ZOOM,
  MAP_STYLE,
  getPartyColor,
  getStateCenter,
  getStateZoom,
} from '@/lib/constants';
import CandidateAvatar from '@/components/CandidateAvatar';
import { useUserLocation } from '@/lib/useUserLocation';
import { findConstituencyAtPoint, STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { usePreferencesStore } from '../../stores/preferences';
import { useFeedStore } from '../../stores/feed';
import { isStateSupported, getStateData } from '../../lib/stateRegistry';
import { MapboxGL, mapboxAvailable } from '@/lib/maplibreCompat';
import { useEnrichedGeo } from '@/lib/useEnrichedGeo';
import { computeDistrictDensityMap } from '@/lib/delimitationDensity';
import {
  partyFillColor,
  marginFillColor,
  reservationFillColor,
  populationFillColor,
  literacyFillColor,
  turnoutFillColor,
  battlegroundFillColor,
  swingFillColor,
  getPartyFillColorExpression,
  getExtrusionHeightExpression,
} from '@/lib/mapFillColors';
import StateSwitcher from '../../components/StateSwitcher';
import MapLegend from '../../components/MapLegend';
import MapFallback from '../../components/MapFallback';
import TriviaCard from '../../components/TriviaCard';
import DefectionBadge from '../../components/DefectionBadge';
import MapColorToggle, { type MapColorMode } from '../../components/MapColorToggle';
import MapSearch from '../../components/MapSearch';
import CompareSheet from '../../components/CompareSheet';
import ChiefMinisterBadge from '../../components/ChiefMinisterBadge';
import PhotoViewerModal from '../../components/PhotoViewerModal';
import { useFavoritesStore } from '../../stores/favorites';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import {
  getUnifiedConstituenciesForState,
  getAvailableYearsForState,
  type UnifiedConstituency,
} from '@/lib/stateDataAdapter';
import { getTriviaForConstituencyInState, getAllTriviaForState } from '@/lib/stateTriviaAdapter';
import { getHistoryForState } from '@/lib/stateDataDispatcher';
import { selectFreshTrivia } from '@/lib/triviaSelector';
import { computeAllSeatAllocations } from '@/lib/delimitation/seatCalculator';
import { styles } from '@/lib/mapScreenStyles';
import MapTimeSlider from '../../components/MapTimeSlider';
import { tapLight, selectionChanged } from '../../lib/haptics';
import { getLocalizedStateName, getLocalizedDistrictName } from '@/lib/stateTranslations';
import { getBoothsForConstituency, hasHierarchyData } from '@/lib/hierarchyData';

interface SelectedConstituency {
  acNo: number;
  name: string;
  district: string;
  winner: string;
  winnerName: string;
  runnerUp: string;
  margin: number;
  votes: number;
  type: string;
  currentParty?: string;
  electionYear: number;
}

// idleTrivia is now computed per-state inside FullMapScreen

export default function MapScreen() {
  if (!mapboxAvailable) return <MapFallback />;
  return <FullMapScreen />;
}

function FullMapScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const cameraRef = useRef<any>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [selected, setSelected] = useState<SelectedConstituency | null>(null);
  const selectedRef = useRef<SelectedConstituency | null>(null);
  const [userMarker, setUserMarker] = useState<[number, number] | null>(null);
  const [colorMode, setColorMode] = useState<MapColorMode>('party');
  const { loading: locating, requestLocation } = useUserLocation();
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds);
  const stateCode = useActiveStateStore((s) => s.stateCode);
  const setStateCode = useActiveStateStore((s) => s.setStateCode);
  const mapOnlyMode = useActiveStateStore((s) => s.mapOnlyMode);
  const broadcastMode = usePreferencesStore((s) => s.broadcastMode);
  const currentState = STATES[stateCode];

  // Spatial UI local tab selections
  const [spatialTab, setSpatialTab] = useState<'feed' | 'stats' | 'list'>('feed');
  const [sheetTab, setSheetTab] = useState<'mla' | 'feed' | 'analytics'>('mla');

  const [showSearch, setShowSearch] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showDelimitation, setShowDelimitation] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ uri: string | null; name: string; party: string } | null>(null);
  const myHome = useMyConstituencyStore((s) => s.home);

  // Premium Map Features States
  const [selectedYear, setSelectedYear] = useState<number>(2023);
  const [is3DMode, setIs3DMode] = useState(false);
  const [focusedDistrict, setFocusedDistrict] = useState<string>('');
  const [mapCompareActive, setMapCompareActive] = useState(false);
  const mapCompareActiveRef = useRef(false);
  const [compareSelected, setCompareSelected] = useState<SelectedConstituency | null>(null);
  const compareSelectedRef = useRef<SelectedConstituency | null>(null);
  const [currentZoom, setCurrentZoom] = useState<number>(() => getStateZoom(stateCode));
  const [selectedBooth, setSelectedBooth] = useState<any | null>(null);

  /** Delimitation seat projections (computed once) */
  const delimitationProjections = useMemo(() => computeAllSeatAllocations(), []);
  const stateProjection = useMemo(
    () => delimitationProjections.find((p) => p.stateCode === stateCode),
    [delimitationProjections, stateCode],
  );

  /**
   * District-level seat density for delimitation overlay.
   * Maps modern districts → census districts, computes pop-per-seat ratio,
   * assigns deviation % to each constituency district.
   *
   * Census 2011 used old district boundaries (e.g. 10 in Telangana),
   * while seed data uses current 33. This map resolves that.
   */
  const districtDensityMap = useMemo(
    () => computeDistrictDensityMap(stateCode, !!stateProjection),
    [stateCode, stateProjection],
  );

  /** Unified constituency list + lookup map for the active state */
  const stateConstituencies = useMemo(
    () => getUnifiedConstituenciesForState(stateCode),
    [stateCode],
  );
  const seedMap = useMemo(
    () => new Map<number, UnifiedConstituency>(stateConstituencies.map((c) => [c.acNo, c])),
    [stateConstituencies],
  );

  /** Streamed + cached boundary GeoJSON for the active state (Phase 3).
   *  Bundled / already-viewed states resolve instantly; others stream once
   *  from the API and cache on-device. */
  const { data: rawEnriched, loading: geoLoading, error: geoError, retry: retryGeo } =
    useEnrichedGeo(stateCode);

  /** GeoJSON for the active state (enriched with party/election data).
   *  Uses universal per-state cache — enrichment runs once per state,
   *  then returns the same stable reference on every re-render / switch-back. */
  const activeGeoJSON = useMemo(() => {
    if (!rawEnriched) return null;

    const lang = i18n.language || 'en';
    return {
      ...rawEnriched,
      features: rawEnriched.features.map((f: any) => {
        const props = { ...f.properties };
        if (stateCode === 'IN') {
          const code = props.STATE_CODE;
          if (code) {
            const localized = getLocalizedStateName(code, lang);
            if (localized) {
              props.STATE_NAME = localized;
            }
          }
        } else {
          const distName = props.DISTRICT || props.DIST_NAME;
          if (distName) {
            const localized = getLocalizedDistrictName(distName, lang);
            if (localized) {
              props.DISTRICT = localized;
              props.DIST_NAME = localized;
            }
          }
        }
        return {
          ...f,
          properties: props,
        };
      }),
    };
  }, [rawEnriched, stateCode, i18n.language]);

  /** Deduped GeoJSON for map labels (STATE_NAME or DISTRICT) */
  const labelGeoJSON = useMemo(() => {
    if (!activeGeoJSON) return null;

    const labelKey = stateCode === 'IN' ? 'STATE_NAME' : 'DISTRICT';
    const featuresGrouped = new Map<string, any[]>();

    for (const f of activeGeoJSON.features) {
      const name = f.properties?.[labelKey] || (labelKey === 'DISTRICT' ? f.properties?.DIST_NAME : undefined);
      if (!name) continue;
      const list = featuresGrouped.get(name) || [];
      list.push(f);
      featuresGrouped.set(name, list);
    }

    const labelFeatures: any[] = [];
    for (const [name, list] of featuresGrouped.entries()) {
      let minLng = Infinity;
      let maxLng = -Infinity;
      let minLat = Infinity;
      let maxLat = -Infinity;
      let hasCoords = false;

      const processPoint = (lng: number, lat: number) => {
        if (typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat)) {
          if (lng < minLng) minLng = lng;
          if (lng > maxLng) maxLng = lng;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
          hasCoords = true;
        }
      };

      for (const f of list) {
        const geom = f.geometry;
        if (!geom) continue;
        if (geom.type === 'Polygon') {
          for (const ring of geom.coordinates) {
            for (const pt of ring) {
              processPoint(pt[0], pt[1]);
            }
          }
        } else if (geom.type === 'MultiPolygon') {
          for (const poly of geom.coordinates) {
            for (const ring of poly) {
              for (const pt of ring) {
                processPoint(pt[0], pt[1]);
              }
            }
          }
        } else if (geom.type === 'Point') {
          processPoint(geom.coordinates[0], geom.coordinates[1]);
        }
      }

      if (hasCoords) {
        labelFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [(minLng + maxLng) / 2, (minLat + maxLat) / 2],
          },
          properties: {
            [labelKey]: name,
            ...(labelKey === 'DISTRICT' ? { DIST_NAME: name } : {}),
          },
        });
      }
    }

    return {
      type: 'FeatureCollection',
      features: labelFeatures,
    };
  }, [activeGeoJSON, stateCode]);


  /** Build delimitation GeoJSON — colours constituencies by district density */
  const delimGeoJSON = useMemo(() => {
    if (!activeGeoJSON || !showDelimitation || districtDensityMap.size === 0) return null;

    return {
      ...activeGeoJSON,
      features: activeGeoJSON.features.map((f: any) => {
        const district = f.properties?.DISTRICT || f.properties?.DIST_NAME || '';
        const deviation = districtDensityMap.get(district) ?? 0;
        let color: string;
        if (deviation > 20) color = '#EF4444';
        else if (deviation > 10) color = '#F97316';
        else if (deviation > 0) color = '#FBBF24';
        else if (deviation > -10) color = '#A3E635';
        else color = '#22C55E';

        return {
          ...f,
          properties: {
            ...f.properties,
            DELIM_COLOR: color,
            DELIM_DEVIATION: Math.round(deviation),
          },
        };
      }),
    };
  }, [activeGeoJSON, showDelimitation, districtDensityMap]);

  /** Random trivia for idle map — re-fetched when state changes */
  const stateIdleTrivia = useMemo(() => {
    const all = getAllTriviaForState(stateCode);
    return selectFreshTrivia(all, 8);
  }, [stateCode]);

  const allPosts = useFeedStore((s) => s.posts);
  const spatialPosts = useMemo(() => {
    let filtered = allPosts.filter((p) => !p.isDeleted);
    if (stateCode === 'IN') {
      return filtered.filter((p) => p.stateCode === 'NATIONAL').slice(0, 5);
    } else {
      return filtered.filter((p) => p.stateCode === stateCode).slice(0, 5);
    }
  }, [allPosts, stateCode]);

  /** Compute fill color expression based on current color mode */
  const activeFillColor = useMemo(() => {
    switch (colorMode) {
      case 'margin': return marginFillColor;
      case 'reservation': return reservationFillColor;
      case 'population': return populationFillColor;
      case 'literacy': return literacyFillColor;
      case 'turnout': return turnoutFillColor;
      case 'battleground': return battlegroundFillColor;
      case 'swing': return swingFillColor;
      default: return getPartyFillColorExpression(selectedYear, stateCode === 'IN');
    }
  }, [colorMode, selectedYear, stateCode]);

  const hasBottomContent = !!(
    myHome ||
    getAvailableYearsForState(stateCode).length > 1 ||
    (stateIdleTrivia && stateIdleTrivia.length > 0)
  );

  const snapPoints = useMemo(() => ['28%', '55%'], []);

  // Keep refs in sync so handlers always see latest state
  selectedRef.current = selected;
  compareSelectedRef.current = compareSelected;
  mapCompareActiveRef.current = mapCompareActive;

  const selectedAcNo = selected && !Number.isNaN(selected.acNo) ? selected.acNo : -1;
  const compareSelectedAcNo = compareSelected && !Number.isNaN(compareSelected.acNo) ? compareSelected.acNo : -1;

  const getSelectedConstituencyObject = useCallback(
    (acNo: number, acName: string, distName: string): SelectedConstituency => {
      const seed = seedMap.get(acNo);
      return {
        acNo,
        name: acName,
        district: distName,
        winner: seed?.winnerParty ?? 'IND',
        winnerName: seed?.winnerName ?? '',
        runnerUp: seed?.runnerUp ?? '',
        margin: seed?.margin ?? 0,
        votes: seed?.winnerVotes ?? 0,
        type: seed?.type ?? 'GEN',
        currentParty: seed?.currentParty,
        electionYear: seed?.electionYear ?? 2023,
      };
    },
    [seedMap],
  );

  const selectConstituency = useCallback(
    (acNo: number, acName: string, distName: string) => {
      if (Number.isNaN(acNo) || acNo == null) return;
      tapLight();
      const obj = getSelectedConstituencyObject(acNo, acName, distName);
      setSelected(obj);
      setSheetTab('mla');
      if (!broadcastMode) {
        bottomSheetRef.current?.snapToIndex(0);
      }
    },
    [getSelectedConstituencyObject, broadcastMode],
  );

  const BOOTH_ZOOM_THRESHOLD = 12.5;

  const handleRegionDidChange = useCallback((event: any) => {
    const zoom = event.properties?.zoomLevel;
    if (typeof zoom === 'number') {
      setCurrentZoom(zoom);
    }
  }, []);

  const handleBoothPress = useCallback((event: any) => {
    const f = event.features?.[0];
    if (f) {
      tapLight();
      setSelectedBooth(f.properties);
    }
  }, []);

  useEffect(() => {
    if (!selected || currentZoom < BOOTH_ZOOM_THRESHOLD) {
      setSelectedBooth(null);
    }
  }, [selected, currentZoom]);

  const boothGeoJSON = useMemo(() => {
    if (!selected || currentZoom < BOOTH_ZOOM_THRESHOLD) return null;
    const booths = getBoothsForConstituency(stateCode, selected.acNo);
    if (!booths || booths.length === 0) return null;

    // Calculate constituency centroid if needed for booths without coordinates
    let constituencyCenter: [number, number] | null = null;
    const hasMissingLocation = booths.some(
      (b) => !b.location || typeof b.location.latitude !== 'number' || typeof b.location.longitude !== 'number'
    );
    if (hasMissingLocation && activeGeoJSON) {
      const feature = activeGeoJSON.features.find((f: any) => Number(f.properties?.AC_NO) === selected.acNo);
      if (feature && feature.geometry) {
        let sumLng = 0;
        let sumLat = 0;
        let count = 0;
        const processCoords = (coords: any) => {
          if (Array.isArray(coords[0])) {
            coords.forEach(processCoords);
          } else if (typeof coords[0] === 'number') {
            sumLng += coords[0];
            sumLat += coords[1];
            count++;
          }
        };
        processCoords(feature.geometry.coordinates);
        if (count > 0) {
          constituencyCenter = [sumLng / count, sumLat / count];
        }
      }
    }

    const features = booths
      .map((b) => {
        let coords: [number, number] | null = null;
        if (b.location && typeof b.location.latitude === 'number' && typeof b.location.longitude === 'number') {
          coords = [b.location.longitude, b.location.latitude];
        } else if (constituencyCenter) {
          const angle = (b.boothNumber * 137.5) * (Math.PI / 180);
          const radius = 0.003 + (b.boothNumber * 0.0001); // ~300m to 1km spread
          coords = [
            constituencyCenter[0] + radius * Math.cos(angle),
            constituencyCenter[1] + radius * Math.sin(angle)
          ];
        }

        if (!coords) return null;

        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: coords,
          },
          properties: {
            id: b.id,
            name: b.nameEn,
            boothNumber: b.boothNumber,
            totalVoters: b.totalVoters ?? 0,
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [selected, currentZoom, stateCode, activeGeoJSON]);

  const handleMapPress = useCallback(
    (event: any) => {
      // Extract tap coordinates from MapLibre / @rnmapbox event formats
      let lng: number | undefined;
      let lat: number | undefined;

      // MapLibre RN: geometry.coordinates = [lng, lat]
      if (event?.geometry?.coordinates) {
        [lng, lat] = event.geometry.coordinates;
      }
      // MapLibre alternative: coordinate array
      else if (event?.coordinate) {
        if (Array.isArray(event.coordinate)) {
          [lng, lat] = event.coordinate;
        }
      }
      // @rnmapbox/maps legacy: {longitude, latitude}
      else if (event?.coordinates) {
        const c = event.coordinates;
        if (Array.isArray(c)) { [lng, lat] = c; }
        else if (c.longitude != null) { lng = c.longitude; lat = c.latitude; }
      }
      // GeoJSONSource onPress or features-based fallback (lngLat as array from native)
      else if (event?.lngLat && Array.isArray(event.lngLat)) {
        [lng, lat] = event.lngLat;
      }

      if (stateCode === 'IN') {
        if (lng == null && event?.features?.[0]?.properties?.STATE_CODE != null) {
          const code = event.features[0].properties.STATE_CODE;
          tapLight();
          setStateCode(code);
          return;
        }
        if (lng == null || lat == null || !activeGeoJSON) return;
        const found = findConstituencyAtPoint(lng, lat, activeGeoJSON);
        if (found?.properties?.STATE_CODE) {
          tapLight();
          setStateCode(found.properties.STATE_CODE);
        }
        return;
      }

      // Helper function to process direct selection properties
      const processDirectSelect = (acNo: number, acName: string, distName: string, clickLng?: number, clickLat?: number) => {
        if (mapCompareActive) {
          tapLight();
          const target = getSelectedConstituencyObject(acNo, acName, distName);
          if (selectedRef.current?.acNo === target.acNo) {
            // Cannot compare a constituency with itself
            return;
          }
          setCompareSelected(target);
          if (clickLng != null && clickLat != null) {
            cameraRef.current?.setCamera({
              centerCoordinate: [clickLng, clickLat],
              zoomLevel: CONSTITUENCY_ZOOM,
              animationDuration: 600,
            });
          }
          return;
        }

        if (selectedRef.current?.acNo === acNo) {
          router.push(`/constituency/${stateCode}-AC-${acNo}` as any);
          return;
        }
        selectConstituency(acNo, acName, distName);

        if (clickLng != null && clickLat != null) {
          cameraRef.current?.setCamera({
            centerCoordinate: [clickLng, clickLat],
            zoomLevel: CONSTITUENCY_ZOOM,
            animationDuration: 600,
          });
        }
      };

      // features-based direct selection (when coords extraction fails)
      if (lng == null && event?.features?.[0]?.properties?.AC_NO != null) {
        const f = event.features[0];
        const { AC_NO, AC_NAME, DIST_NAME } = f.properties;
        const acNo = Number(AC_NO);
        const lngLat = event.lngLat;
        const clickLng = Array.isArray(lngLat) ? lngLat[0] : undefined;
        const clickLat = Array.isArray(lngLat) ? lngLat[1] : undefined;

        processDirectSelect(acNo, AC_NAME, DIST_NAME, clickLng, clickLat);
        return;
      }

      if (lng == null || lat == null || !activeGeoJSON) return;

      // Reliable point-in-polygon constituency detection (works offline, all states)
      const found = findConstituencyAtPoint(lng, lat, activeGeoJSON);
      if (!found) return;

      const { AC_NO, AC_NAME, DIST_NAME } = found.properties;
      const acNo = Number(AC_NO);

      processDirectSelect(acNo, AC_NAME, DIST_NAME, lng, lat);
    },
    [selectConstituency, router, activeGeoJSON, mapCompareActive, getSelectedConstituencyObject, stateCode, setStateCode],
  );

  // Update camera pitch dynamically when 3D mode is toggled
  useEffect(() => {
    cameraRef.current?.setCamera({
      pitch: is3DMode ? 55 : 0,
      animationDuration: 600,
    });
  }, [is3DMode]);

  // Fly camera to new state when state switcher changes
  useEffect(() => {
    setSelected(null);
    setCompareSelected(null);
    setMapCompareActive(false);
    setFocusedDistrict('');
    bottomSheetRef.current?.close();

    const years = getAvailableYearsForState(stateCode);
    setSelectedYear(years[years.length - 1]);
    setCurrentZoom(getStateZoom(stateCode));
    setSelectedBooth(null);

    cameraRef.current?.setCamera({
      centerCoordinate: getStateCenter(stateCode),
      zoomLevel: getStateZoom(stateCode),
      pitch: is3DMode ? 55 : 0,
      animationDuration: 800,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode]);

  const handleReset = useCallback(() => {
    setSelected(null);
    setCompareSelected(null);
    setMapCompareActive(false);
    setFocusedDistrict('');
    setUserMarker(null);
    bottomSheetRef.current?.close();
    if (stateCode !== 'IN') {
      setStateCode('IN');
    } else {
      cameraRef.current?.setCamera({
        centerCoordinate: getStateCenter('IN'),
        zoomLevel: getStateZoom('IN'),
        animationDuration: 600,
      });
    }
  }, [stateCode, setStateCode]);

  const handleLocateMe = useCallback(async () => {
    const loc = await requestLocation();
    if (!loc) return;

    const coord: [number, number] = [loc.longitude, loc.latitude];
    setUserMarker(coord);

    if (stateCode === 'IN') {
      const found = activeGeoJSON ? findConstituencyAtPoint(
        loc.longitude,
        loc.latitude,
        activeGeoJSON,
      ) : null;
      if (found?.properties?.STATE_CODE) {
        setStateCode(found.properties.STATE_CODE);
      } else {
        cameraRef.current?.setCamera({
          centerCoordinate: coord,
          zoomLevel: 6,
          animationDuration: 800,
        });
      }
      return;
    }

    const found = activeGeoJSON ? findConstituencyAtPoint(
      loc.longitude,
      loc.latitude,
      activeGeoJSON,
    ) : null;

    if (found) {
      selectConstituency(
        found.properties.AC_NO,
        found.properties.AC_NAME,
        found.properties.DIST_NAME,
      );
      cameraRef.current?.setCamera({
        centerCoordinate: coord,
        zoomLevel: CONSTITUENCY_ZOOM,
        animationDuration: 800,
      });
    } else {
      setSelected(null);
      setCompareSelected(null);
      cameraRef.current?.setCamera({
        centerCoordinate: coord,
        zoomLevel: 8,
        animationDuration: 800,
      });
    }
  }, [requestLocation, selectConstituency, activeGeoJSON, stateCode, setStateCode]);

  const handleViewDetail = useCallback(() => {
    if (selected) {
      router.push(`/constituency/${stateCode}-AC-${selected.acNo}` as any);
    }
  }, [selected, stateCode, router]);

  const { insets } = useResponsive();
  const mapTopOffset = insets.top + 8;

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MAP_STYLE}
        onPress={handleMapPress}
        onRegionDidChange={handleRegionDidChange}
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={is3DMode || stateCode === 'IN'}
        pitchEnabled={is3DMode || stateCode === 'IN'}
        compassEnabled={is3DMode || stateCode === 'IN'}
        scaleBarEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: getStateCenter(stateCode),
            zoomLevel: getStateZoom(stateCode),
            padding: { paddingTop: 80, paddingBottom: 40, paddingLeft: 16, paddingRight: 16 },
          }}
          pitch={is3DMode ? 55 : 0}
          minZoomLevel={stateCode === 'IN' ? 2.5 : 5}
          maxZoomLevel={14}
        />

        {/* ── Constituency polygon layers (uniform for all states) ──
             key={stateCode} forces React to unmount old sources & mount new ones
             when the user switches states. This prevents MapLibre from holding
             stale GeoJSON data in its GL engine (root cause of grey/dark maps).
             Dynamic IDs ensure MapLibre never confuses old/new sources. */}
        {activeGeoJSON && (
          <React.Fragment key={stateCode}>
            <MapboxGL.ShapeSource
              id={`constituencies-${stateCode}`}
              shape={activeGeoJSON}
              onPress={handleMapPress}
            >
              {is3DMode ? (
                <MapboxGL.FillExtrusionLayer
                  id={`constituency-extrusion-${stateCode}`}
                  style={{
                    fillExtrusionColor: [
                      'case',
                      ['==', ['get', 'AC_NO'], selectedAcNo],
                      '#FFD700',
                      ['==', ['get', 'AC_NO'], compareSelectedAcNo],
                      '#00E5FF',
                      // District focus masking — fade non-focused districts via color
                      // (fillExtrusionOpacity is per-layer zoom-only in MapLibre,
                      //  so per-feature opacity must be baked into fillExtrusionColor).
                      ['all', ['literal', focusedDistrict !== ''], ['!=', ['get', 'DISTRICT'], focusedDistrict]],
                      focusedDistrict !== '' ? 'rgba(40,40,60,0.15)' : activeFillColor,
                      activeFillColor,
                    ],
                    fillExtrusionHeight: getExtrusionHeightExpression(colorMode, stateCode === 'IN'),
                    fillExtrusionOpacity: 0.75,
                    fillExtrusionBase: 0,
                  }}
                />
              ) : (
                <MapboxGL.FillLayer
                  id={`constituency-fill-${stateCode}`}
                  style={{
                    fillColor: [
                      'case',
                      ['==', ['get', 'AC_NO'], selectedAcNo],
                      '#FFD700',
                      ['==', ['get', 'AC_NO'], compareSelectedAcNo],
                      '#00E5FF',
                      activeFillColor,
                    ],
                    fillOpacity: [
                      'case',
                      // District focus masking
                      ['all', ['literal', focusedDistrict !== ''], ['!=', ['get', 'DISTRICT'], focusedDistrict]],
                      0.1,
                      ['case', ['==', ['get', 'AC_NO'], selectedAcNo], 0.8, 0.5],
                    ],
                  }}
                />
              )}

              <MapboxGL.LineLayer
                id={`constituency-border-${stateCode}`}
                style={{
                  lineColor: [
                    'case',
                    ['==', ['get', 'AC_NO'], selectedAcNo],
                    '#FFD700',
                    ['==', ['get', 'AC_NO'], compareSelectedAcNo],
                    '#00E5FF',
                    'rgba(255,255,255,0.4)',
                  ],
                  lineWidth: [
                    'case',
                    ['==', ['get', 'AC_NO'], selectedAcNo],
                    2.5,
                    ['==', ['get', 'AC_NO'], compareSelectedAcNo],
                    2.5,
                    0.6,
                  ],
                  lineOpacity: [
                    'case',
                    ['all', ['literal', focusedDistrict !== ''], ['!=', ['get', 'DISTRICT'], focusedDistrict]],
                    0.1,
                    0.8,
                  ],
                }}
              />

            </MapboxGL.ShapeSource>

            {labelGeoJSON && (
              <MapboxGL.ShapeSource
                id={`constituency-labels-source-${stateCode}`}
                shape={labelGeoJSON}
              >
                <MapboxGL.SymbolLayer
                  id={`constituency-labels-${stateCode}`}
                  style={{
                    textField: stateCode === 'IN' ? ['get', 'STATE_NAME'] : ['get', 'DISTRICT'],
                    textSize: stateCode === 'IN' ? 12 : 10,
                    textColor: '#FFFFFF',
                    textHaloColor: '#0A0A1A',
                    textHaloWidth: 1.5,
                    textAnchor: 'center',
                    ...(is3DMode ? {
                      symbolZElevate: true,
                      textIgnorePlacement: true,
                      textAllowOverlap: true,
                    } : {
                      textAllowOverlap: false,
                      textIgnorePlacement: false,
                    }),
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* Favourites highlight layer */}
            <MapboxGL.ShapeSource
              id={`favourites-${stateCode}`}
              shape={activeGeoJSON}
            >
              <MapboxGL.LineLayer
                id={`fav-border-${stateCode}`}
                filter={['in', ['get', 'AC_NO'], ['literal', favoriteIds]]}
                style={{
                  lineColor: '#EF4444',
                  lineWidth: 2.5,
                  lineOpacity: 0.9,
                }}
              />
            </MapboxGL.ShapeSource>

            {/* Polling Booth Layer (Map-based Hierarchy Zoom) */}
            {boothGeoJSON && (
              <MapboxGL.ShapeSource
                id={`booths-source-${stateCode}-${selected?.acNo}`}
                shape={boothGeoJSON}
                onPress={handleBoothPress}
              >
                <MapboxGL.CircleLayer
                  id={`booth-circles-${stateCode}-${selected?.acNo}`}
                  style={{
                    circleRadius: 6,
                    circleColor: '#FF3B30',
                    circleStrokeWidth: 1.5,
                    circleStrokeColor: '#FFFFFF',
                    circlePitchAlignment: 'map',
                  }}
                />
                <MapboxGL.SymbolLayer
                  id={`booth-labels-${stateCode}-${selected?.acNo}`}
                  style={{
                    textField: ['concat', 'B-', ['get', 'boothNumber']],
                    textSize: 9,
                    textColor: '#FFFFFF',
                    textHaloColor: '#000000',
                    textHaloWidth: 1,
                    textOffset: [0, 1.2],
                    textAnchor: 'top',
                    textAllowOverlap: false,
                    textIgnorePlacement: false,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}

            {/* ── Delimitation overlay: district-level population density ── */}
            {showDelimitation && delimGeoJSON && (
              <MapboxGL.ShapeSource id={`delim-overlay-${stateCode}`} shape={delimGeoJSON}>
                <MapboxGL.FillLayer
                  id={`delim-fill-${stateCode}`}
                  style={{
                    fillColor: ['get', 'DELIM_COLOR'],
                    fillOpacity: 0.55,
                  }}
                />
                <MapboxGL.LineLayer
                  id={`delim-border-${stateCode}`}
                  style={{
                    lineColor: '#FFFFFF',
                    lineWidth: 0.5,
                    lineOpacity: 0.3,
                  }}
                />
              </MapboxGL.ShapeSource>
            )}
          </React.Fragment>
        )}

        {/* User location marker */}
        {userMarker && (
          <MapboxGL.PointAnnotation
            id="user-location"
            coordinate={userMarker}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={styles.userMarker}>
              <View style={styles.userMarkerInner} />
            </View>
          </MapboxGL.PointAnnotation>
        )}
      </MapboxGL.MapView>

      {/* Boundary streaming overlay (Phase 3) — keeps the map feeling alive
          while a state's polygons download for the first time. */}
      {geoLoading && !activeGeoJSON && (
        <View style={styles.geoOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#FCD34D" />
          <Text style={styles.geoOverlayText}>
            {t('map.loadingBoundaries', 'Loading map…')}
          </Text>
        </View>
      )}
      {geoError && !activeGeoJSON && (
        <View style={styles.geoOverlay}>
          <Ionicons name="cloud-offline-outline" size={32} color="#F87171" />
          <Text style={styles.geoOverlayText}>
            {t('map.boundariesFailed', "Couldn't load this map")}
          </Text>
          <Pressable style={styles.geoRetryButton} onPress={retryGeo}>
            <Ionicons name="refresh" size={16} color="#0A0A1A" />
            <Text style={styles.geoRetryText}>{t('common.retry', 'Retry')}</Text>
          </Pressable>
        </View>
      )}

      {/* Exit Broadcast Mode overlay button */}
      {broadcastMode && (
        <Pressable
          style={{
            position: 'absolute',
            top: mapTopOffset,
            right: 16,
            backgroundColor: 'rgba(17, 24, 39, 0.5)',
            width: 36,
            height: 36,
            borderRadius: 18,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onPress={() => {
            tapLight();
            usePreferencesStore.getState().setBroadcastMode(false);
          }}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" style={{ opacity: 0.6 }} />
        </Pressable>
      )}

      {/* Header overlay */}
      {!broadcastMode && (
        <View style={[styles.header, { top: mapTopOffset }]}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>KSHETRA</Text>
            <StateSwitcher />
          </View>
          <Text style={styles.headerSubtitle}>
            {stateCode === 'IN'
              ? 'National Overview'
              : `${currentState?.name ?? stateCode} · ${currentState?.assemblySeats ?? '?'} ${t('explore.constituencies')}`}
          </Text>
          <ChiefMinisterBadge stateCode={stateCode} compact />
        </View>
      )}

      {/* Floating Polling Booth Callout (Map-Based Hierarchy Zoom) */}
      {selectedBooth && (
        <View
          style={{
            position: 'absolute',
            top: mapTopOffset + (stateCode === 'IN' ? 70 : 130),
            left: 16,
            right: 16,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: '#FF3B3080',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            zIndex: 99,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: '800', color: '#FF3B30', letterSpacing: 1, textTransform: 'uppercase' }}>
              Polling Booth #{selectedBooth.boothNumber}
            </Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginTop: 2 }} numberOfLines={1}>
              {selectedBooth.name}
            </Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              {(selectedBooth.totalVoters || 0).toLocaleString()} Registered Voters
            </Text>
          </View>
          <Pressable onPress={() => setSelectedBooth(null)} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={22} color="#FF3B30" />
          </Pressable>
        </View>
      )}

      {/* Action buttons */}
      {!broadcastMode && (
        <View style={[styles.actionButtons, { top: mapTopOffset + (stateCode === 'IN' ? 50 : 110) }]}>
          {stateCode !== 'IN' && (
            <Pressable
              style={styles.actionButton}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search" size={20} color="#FFFFFF" />
            </Pressable>
          )}
          {stateCode !== 'IN' && (
            <Pressable
              style={[styles.actionButton, styles.compareButton]}
              onPress={() => setShowCompare(true)}
            >
              <Ionicons name="git-compare" size={20} color="#FFFFFF" />
            </Pressable>
          )}
          {(selected || mapCompareActive || focusedDistrict !== '' || stateCode !== 'IN') && (
            <Pressable style={styles.actionButton} onPress={handleReset}>
              <Ionicons name="resize" size={20} color="#FFFFFF" />
            </Pressable>
          )}

          {/* 3D Extrusion Toggle */}
          <Pressable
            style={[styles.actionButton, is3DMode && styles.activeButton]}
            onPress={() => {
              tapLight();
              setIs3DMode((v) => !v);
            }}
          >
            <Ionicons name="cube" size={20} color={is3DMode ? '#FCD34D' : '#FFFFFF'} />
          </Pressable>

          {/* District Focus Toggle */}
          {stateCode !== 'IN' && (
            <Pressable
              style={[
                styles.actionButton,
                focusedDistrict !== '' && styles.activeButton,
                !selected && styles.actionButtonDisabled,
              ]}
              onPress={() => {
                if (!selected) return;
                tapLight();
                setFocusedDistrict((d) => (d === selected.district ? '' : selected.district));
              }}
              disabled={!selected}
            >
              <Ionicons
                name="funnel"
                size={20}
                color={focusedDistrict !== '' ? '#FCD34D' : selected ? '#FFFFFF' : '#4B5563'}
              />
            </Pressable>
          )}

          {stateCode !== 'IN' && (
            <Pressable
              style={[
                styles.actionButton,
                showDelimitation && styles.delimButtonActive,
              ]}
              onPress={() => setShowDelimitation((v) => !v)}
            >
              <Ionicons name="layers" size={20} color={showDelimitation ? '#FCD34D' : '#FFFFFF'} />
            </Pressable>
          )}
          <Pressable
            style={[
              styles.actionButton,
              styles.locateButton,
              locating && styles.actionButtonDisabled,
            ]}
            onPress={handleLocateMe}
            disabled={locating}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="navigate" size={20} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      )}

      {/* Map Legend */}
      {!broadcastMode && <MapLegend colorMode={colorMode} stateCode={stateCode} />}

      {/* Color mode toggle */}
      {!broadcastMode && stateCode !== 'IN' && (
        <View style={[styles.colorToggleContainer, { top: mapTopOffset + 110 }]}>
          <MapColorToggle mode={colorMode} onModeChange={setColorMode} />
        </View>
      )}

      {/* Delimitation overlay info bar */}
      {!broadcastMode && showDelimitation && stateProjection && (
        <View style={styles.delimBar}>
          <View style={styles.delimBarTop}>
            <Ionicons name="layers" size={14} color="#FCD34D" />
            <Text style={styles.delimBarTitle}>Seat Density Overlay</Text>
            <Text style={styles.delimBarBadge}>PROJECTED</Text>
          </View>
          <View style={styles.delimBarLegend}>
            <View style={[styles.delimDot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.delimBarLbl}>&gt;20%</Text>
            <View style={[styles.delimDot, { backgroundColor: '#F97316' }]} />
            <Text style={styles.delimBarLbl}>10-20%</Text>
            <View style={[styles.delimDot, { backgroundColor: '#FBBF24' }]} />
            <Text style={styles.delimBarLbl}>0-10%</Text>
            <View style={[styles.delimDot, { backgroundColor: '#A3E635' }]} />
            <Text style={styles.delimBarLbl}>-10-0%</Text>
            <View style={[styles.delimDot, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.delimBarLbl}>&lt;-10%</Text>
          </View>
          <View style={styles.delimBarLegend}>
            <Text style={[styles.delimBarLbl, { color: '#EF4444' }]}>Under-represented</Text>
            <View style={styles.delimBarSpacer} />
            <Text style={styles.delimBarStat}>{stateProjection.currentSeats}</Text>
            <Ionicons name="arrow-forward" size={12} color="#FCD34D" />
            <Text style={[styles.delimBarStat, { color: '#10B981' }]}>{stateProjection.projectedSeats}</Text>
            <View style={styles.delimBarSpacer} />
            <Text style={[styles.delimBarLbl, { color: '#22C55E' }]}>Over-represented</Text>
          </View>
          <Pressable onPress={() => router.push('/delimitation' as any)}>
            <Text style={styles.delimBarLink}>View full analysis →</Text>
          </Pressable>
        </View>
      )}

      {/* Spatial Hub Overlay (when mapOnlyMode is active and no selection is active) */}
      {!broadcastMode && mapOnlyMode && !selected && !showDelimitation && !mapCompareActive && (
        <View style={styles.spatialHub}>
          {/* Spatial Hub Tabs */}
          <View style={styles.spatialHubTabs}>
            <Pressable
              style={[styles.spatialHubTab, spatialTab === 'feed' && styles.spatialHubTabActive]}
              onPress={() => setSpatialTab('feed')}
            >
              <Text style={[styles.spatialHubTabText, spatialTab === 'feed' && styles.spatialHubTabTextActive]}>
                Feed
              </Text>
            </Pressable>
            <Pressable
              style={[styles.spatialHubTab, spatialTab === 'stats' && styles.spatialHubTabActive]}
              onPress={() => setSpatialTab('stats')}
            >
              <Text style={[styles.spatialHubTabText, spatialTab === 'stats' && styles.spatialHubTabTextActive]}>
                Analytics
              </Text>
            </Pressable>
            <Pressable
              style={[styles.spatialHubTab, spatialTab === 'list' && styles.spatialHubTabActive]}
              onPress={() => setSpatialTab('list')}
            >
              <Text style={[styles.spatialHubTabText, spatialTab === 'list' && styles.spatialHubTabTextActive]}>
                {stateCode === 'IN' ? 'States' : 'Constituencies'}
              </Text>
            </Pressable>
          </View>

          {/* Spatial Hub Content */}
          {spatialTab === 'feed' && (
            <ScrollView style={styles.spatialHubScroll}>
              {spatialPosts.length === 0 ? (
                <Text style={styles.spatialHubEmpty}>No feed posts available</Text>
              ) : (
                spatialPosts.map((p) => (
                  <View key={p.id} style={styles.spatialHubRow}>
                    <Ionicons
                      name={p.type === 'news' ? 'newspaper' : p.type === 'opinion' ? 'megaphone' : 'chatbubbles'}
                      size={14}
                      color="#4F8EF7"
                      style={{ marginRight: 8 }}
                    />
                    <View style={styles.spatialHubRowInfo}>
                      <Text style={styles.spatialHubRowTitle} numberOfLines={1}>{p.content}</Text>
                      <Text style={styles.spatialHubRowSubtitle}>{p.author.displayName} · {new Date(p.createdAt).toLocaleDateString()}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {spatialTab === 'stats' && (
            <ScrollView style={styles.spatialHubScroll}>
              {stateCode === 'IN' ? (
                (() => {
                  const counts = new Map<string, number>();
                  for (const state of Object.values(STATES)) {
                    const p = state.rulingParty;
                    if (p) counts.set(p, (counts.get(p) ?? 0) + 1);
                  }
                  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
                  return sorted.map(([party, count]) => (
                    <View key={party} style={styles.spatialHubRow}>
                      <View style={[styles.spatialHubDot, { backgroundColor: getPartyColor(party) }]} />
                      <View style={styles.spatialHubRowInfo}>
                        <Text style={styles.spatialHubRowTitle}>{party}</Text>
                        <Text style={styles.spatialHubRowSubtitle}>Rules {count} {count === 1 ? 'state' : 'states'}</Text>
                      </View>
                    </View>
                  ));
                })()
              ) : (
                (() => {
                  const counts = new Map<string, number>();
                  for (const c of stateConstituencies) {
                    const p = c.currentParty || c.winnerParty;
                    counts.set(p, (counts.get(p) ?? 0) + 1);
                  }
                  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
                  if (sorted.length === 0) {
                    return <Text style={styles.spatialHubEmpty}>No statistics available</Text>;
                  }
                  return sorted.map(([party, count]) => (
                    <View key={party} style={styles.spatialHubRow}>
                      <View style={[styles.spatialHubDot, { backgroundColor: getPartyColor(party) }]} />
                      <View style={styles.spatialHubRowInfo}>
                        <Text style={styles.spatialHubRowTitle}>{party}</Text>
                        <Text style={styles.spatialHubRowSubtitle}>{count} seats won / leading</Text>
                      </View>
                    </View>
                  ));
                })()
              )}
            </ScrollView>
          )}

          {spatialTab === 'list' && (
            <ScrollView style={styles.spatialHubScroll}>
              {stateCode === 'IN' ? (
                Object.values(STATES).map((state) => {
                  const data = getStateData(state.code);
                  const supported = isStateSupported(state.code);
                  return (
                    <Pressable
                      key={state.code}
                      style={styles.spatialHubRow}
                      onPress={() => {
                        tapLight();
                        setStateCode(state.code);
                      }}
                    >
                      <View style={[styles.spatialHubDot, { backgroundColor: getPartyColor(state.rulingParty) }]} />
                      <View style={styles.spatialHubRowInfo}>
                        <Text style={styles.spatialHubRowTitle}>{state.name}</Text>
                        <Text style={styles.spatialHubRowSubtitle}>
                          {state.assemblySeats} constituencies · Ruled by {state.rulingParty}
                        </Text>
                      </View>
                      <View style={styles.spatialHubBadge}>
                        <Text style={styles.spatialHubBadgeText}>{supported ? 'Active' : 'Stub'}</Text>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                stateConstituencies.slice(0, 30).map((c) => (
                  <Pressable
                    key={c.acNo}
                    style={styles.spatialHubRow}
                    onPress={() => {
                      selectConstituency(c.acNo, c.name, c.district);
                      const feature = activeGeoJSON?.features.find(
                        (f) => f.properties?.AC_NO === c.acNo,
                      );
                      if (feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon') {
                        const coords = feature.geometry.type === 'Polygon'
                          ? (feature.geometry as GeoJSON.Polygon).coordinates[0]
                          : (feature.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
                        if (coords?.length > 0) {
                          let sumLng = 0, sumLat = 0;
                          for (const pt of coords) { sumLng += pt[0]; sumLat += pt[1]; }
                          cameraRef.current?.setCamera({
                            centerCoordinate: [sumLng / coords.length, sumLat / coords.length],
                            zoomLevel: CONSTITUENCY_ZOOM,
                            animationDuration: 600,
                          });
                        }
                      }
                    }}
                  >
                    <View style={[styles.spatialHubDot, { backgroundColor: getPartyColor(c.winnerParty) }]} />
                    <View style={styles.spatialHubRowInfo}>
                      <Text style={styles.spatialHubRowTitle}>{c.name}</Text>
                      <Text style={styles.spatialHubRowSubtitle}>AC #{c.acNo} · {c.district}</Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Bottom Dashboard: stacks timeline slider, idle trivia, and home button dynamically */}
      {!broadcastMode && !mapOnlyMode && !selected && !showDelimitation && !mapCompareActive && hasBottomContent && (
        <View style={styles.bottomDashboardContainer}>
          {/* My Constituency home marker */}
          {myHome && stateCode !== 'IN' && (
            <Pressable
              style={styles.homeIndicatorUnified}
              onPress={() => {
                tapLight();
                selectConstituency(myHome.acNo, myHome.name, myHome.district);
                const feature = activeGeoJSON?.features.find(
                  (f) => f.properties?.AC_NO === myHome.acNo,
                );
                if (feature?.geometry?.type === 'Point') {
                  cameraRef.current?.setCamera({
                    centerCoordinate: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
                    zoomLevel: CONSTITUENCY_ZOOM,
                    animationDuration: 600,
                  });
                } else if (feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon') {
                  const coords = feature.geometry.type === 'Polygon'
                    ? (feature.geometry as GeoJSON.Polygon).coordinates[0]
                    : (feature.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
                  if (coords?.length > 0) {
                    let sumLng = 0, sumLat = 0;
                    for (const pt of coords) { sumLng += pt[0]; sumLat += pt[1]; }
                    cameraRef.current?.setCamera({
                      centerCoordinate: [sumLng / coords.length, sumLat / coords.length],
                      zoomLevel: CONSTITUENCY_ZOOM,
                      animationDuration: 600,
                    });
                  }
                }
              }}
            >
              <Ionicons name="home" size={12} color="#10B981" />
              <Text style={styles.homeTextUnified}>{myHome.name}</Text>
            </Pressable>
          )}

          {/* Time-Travel History Slider (conditional on state data availability) */}
          {getAvailableYearsForState(stateCode).length > 1 && (
            <View style={styles.timeSliderWrapper}>
              <MapTimeSlider
                years={getAvailableYearsForState(stateCode)}
                selectedYear={selectedYear}
                onYearChange={(year) => {
                  selectionChanged();
                  setSelectedYear(year);
                }}
              />
            </View>
          )}

          {/* Idle trivia — state-specific */}
          {stateIdleTrivia.length > 0 && (
            <View style={styles.idleTriviaWrapper}>
              <TriviaCard items={stateIdleTrivia} compact rotateInterval={5000} />
            </View>
          )}
        </View>
      )}

      {/* Side-by-Side Map Comparison Panel */}
      {mapCompareActive && selected && (
        <View style={styles.compareCard}>
          <View style={styles.compareHeader}>
            <Text style={styles.compareTitle}>CONSTITUENCY COMPARISON</Text>
            <Pressable
              style={styles.compareClose}
              onPress={() => {
                tapLight();
                setMapCompareActive(false);
                setCompareSelected(null);
              }}
            >
              <Ionicons name="close" size={18} color="#9CA3AF" />
            </Pressable>
          </View>
          <View style={styles.compareBody}>
            {/* Left Seat */}
            <View style={[styles.compareCol, styles.compareColLeft]}>
              <Text style={styles.compareSeatName} numberOfLines={1}>{selected.name ?? ''}</Text>
              <Text style={styles.compareParty}>{selected.winner ?? 'IND'} (AC #{selected.acNo ?? -1})</Text>
              <Text style={styles.compareStatLabel}>Margin</Text>
              <Text style={styles.compareStatValue}>{(selected.margin ?? 0).toLocaleString()} votes</Text>
              <Text style={styles.compareStatLabel}>Winner Votes</Text>
              <Text style={styles.compareStatValue}>{(selected.votes ?? 0).toLocaleString()}</Text>
            </View>

            {/* Right Seat */}
            {compareSelected ? (
              <View style={[styles.compareCol, styles.compareColRight]}>
                <Text style={styles.compareSeatName} numberOfLines={1}>{compareSelected.name ?? ''}</Text>
                <Text style={styles.compareParty}>{compareSelected.winner ?? 'IND'} (AC #{compareSelected.acNo ?? -1})</Text>
                <Text style={styles.compareStatLabel}>Margin</Text>
                <Text style={styles.compareStatValue}>{(compareSelected.margin ?? 0).toLocaleString()} votes</Text>
                <Text style={styles.compareStatLabel}>Winner Votes</Text>
                <Text style={styles.compareStatValue}>{(compareSelected.votes ?? 0).toLocaleString()}</Text>
              </View>
            ) : (
              <View style={styles.compareCol}>
                <Text style={[styles.compareSeatName, { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginTop: 10, textAlign: 'center' }]}>
                  Tap another constituency on the map to compare...
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Search overlay */}
      {showSearch && (
        <MapSearch
          constituencies={stateConstituencies}
          onSelect={(acNo, name, district) => {
            setShowSearch(false);
            selectConstituency(acNo, name, district);
            const feature = activeGeoJSON?.features.find(
              (f) => f.properties?.AC_NO === acNo,
            );
            if (feature?.geometry?.type === 'Point') {
              cameraRef.current?.setCamera({
                centerCoordinate: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
                zoomLevel: CONSTITUENCY_ZOOM,
                animationDuration: 600,
              });
            } else if (feature?.geometry?.type === 'Polygon' || feature?.geometry?.type === 'MultiPolygon') {
              const coords = feature.geometry.type === 'Polygon'
                ? (feature.geometry as GeoJSON.Polygon).coordinates[0]
                : (feature.geometry as GeoJSON.MultiPolygon).coordinates[0][0];
              if (coords?.length > 0) {
                let sumLng = 0, sumLat = 0;
                for (const pt of coords) { sumLng += pt[0]; sumLat += pt[1]; }
                cameraRef.current?.setCamera({
                  centerCoordinate: [sumLng / coords.length, sumLat / coords.length],
                  zoomLevel: CONSTITUENCY_ZOOM,
                  animationDuration: 600,
                });
              }
            }
          }}
          onClose={() => setShowSearch(false)}
        />
      )}

      {/* Compare sheet — mount only when needed to avoid Fabric Modal crash */}
      {showCompare && (
        <CompareSheet
          visible={showCompare}
          initialAcNo={selected && !Number.isNaN(selected.acNo) ? selected.acNo : undefined}
          onClose={() => setShowCompare(false)}
        />
      )}

      {/* Photo viewer modal — tap candidate avatar to enlarge */}
      <PhotoViewerModal
        visible={!!photoViewer}
        imageUri={photoViewer?.uri ?? null}
        name={photoViewer?.name ?? ''}
        party={photoViewer?.party ?? ''}
        subtitle={selected ? `AC #${selected.acNo} · ${selected.district}` : undefined}
        onClose={() => setPhotoViewer(null)}
      />

      {/* Bottom Sheet */}
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        onClose={() => {
          if (!mapCompareActiveRef.current) {
            setSelected(null);
          }
        }}
      >
        {selected && (
          <BottomSheetView style={styles.sheetContent}>
            {/* Sheet header */}
            <View style={styles.sheetHeader}>
              <View
                style={[
                  styles.partyBadge,
                  { backgroundColor: getPartyColor(selected.winner) },
                ]}
              >
                <Text style={styles.partyBadgeText}>{selected.winner}</Text>
              </View>
              <View style={styles.sheetTitleGroup}>
                <Text style={styles.sheetTitle}>{selected.name}</Text>
                <Text style={styles.sheetSubtitle}>
                  AC #{selected.acNo} · {selected.district} · {selected.type}
                </Text>
              </View>
            </View>

            {/* Spatial Tabs */}
            {mapOnlyMode && (
              <View style={[styles.spatialHubTabs, { marginBottom: 14 }]}>
                <Pressable
                  style={[styles.spatialHubTab, sheetTab === 'mla' && styles.spatialHubTabActive]}
                  onPress={() => setSheetTab('mla')}
                >
                  <Text style={[styles.spatialHubTabText, sheetTab === 'mla' && styles.spatialHubTabTextActive]}>
                    MLA Profile
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.spatialHubTab, sheetTab === 'feed' && styles.spatialHubTabActive]}
                  onPress={() => setSheetTab('feed')}
                >
                  <Text style={[styles.spatialHubTabText, sheetTab === 'feed' && styles.spatialHubTabTextActive]}>
                    Feed
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.spatialHubTab, sheetTab === 'analytics' && styles.spatialHubTabActive]}
                  onPress={() => setSheetTab('analytics')}
                >
                  <Text style={[styles.spatialHubTabText, sheetTab === 'analytics' && styles.spatialHubTabTextActive]}>
                    Analytics
                  </Text>
                </Pressable>
              </View>
            )}

            {(!mapOnlyMode || sheetTab === 'mla') && (
              <>
                {/* Election result */}
                <View style={styles.resultSection}>
                  <Text style={styles.resultLabel}>{t('mapSheet.winnerYear', { year: selected.electionYear })}</Text>
                  <View style={styles.resultWinnerRow}>
                    <CandidateAvatar
                      key={selected.winnerName}
                      name={selected.winnerName}
                      party={selected.winner}
                      size={36}
                      onPress={(uri) => setPhotoViewer({ uri, name: selected.winnerName, party: selected.winner })}
                    />
                    <Text style={styles.resultValue}>{selected.winnerName}</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {selected.votes.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>{t('mapSheet.winnerVotes')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>
                      {selected.margin.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>{t('mapSheet.margin')}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statValue}>{selected.runnerUp}</Text>
                    <Text style={styles.statLabel}>{t('mapSheet.runnerUp')}</Text>
                  </View>
                </View>

                {/* Defection badge */}
                {selected.currentParty && selected.currentParty !== selected.winner && (
                  <View style={styles.defectionRow}>
                    <DefectionBadge
                      electedParty={selected.winner}
                      currentParty={selected.currentParty}
                      compact
                    />
                  </View>
                )}

                {/* View detail button */}
                <Pressable style={styles.detailButton} onPress={handleViewDetail}>
                  <Text style={styles.detailButtonText}>
                    {t('mapSheet.viewFullProfile')}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                </Pressable>
              </>
            )}

            {mapOnlyMode && sheetTab === 'feed' && (
              <ScrollView style={{ maxHeight: 180 }}>
                {(() => {
                  const localPosts = allPosts.filter((p) => p.constituencyId === `${stateCode}-AC-${selected.acNo}` && !p.isDeleted);
                  return localPosts.length === 0 ? (
                    <Text style={styles.spatialHubEmpty}>No discussions in this constituency yet</Text>
                  ) : (
                    localPosts.map((p) => (
                      <View key={p.id} style={styles.spatialHubRow}>
                        <Ionicons
                          name={p.type === 'news' ? 'newspaper' : p.type === 'opinion' ? 'megaphone' : 'chatbubbles'}
                          size={14}
                          color="#4F8EF7"
                          style={{ marginRight: 8 }}
                        />
                        <View style={styles.spatialHubRowInfo}>
                          <Text style={styles.spatialHubRowTitle} numberOfLines={1}>{p.content}</Text>
                          <Text style={styles.spatialHubRowSubtitle}>{p.author.displayName} · {new Date(p.createdAt).toLocaleDateString()}</Text>
                        </View>
                      </View>
                    ))
                  );
                })()}
              </ScrollView>
            )}

            {(!mapOnlyMode || sheetTab === 'analytics') && (
              <>
                {mapOnlyMode && (() => {
                  const feature = activeGeoJSON?.features.find((f) => f.properties?.AC_NO === selected.acNo);
                  const props = feature?.properties;
                  if (!props) return null;
                  return (
                    <View style={{ gap: 8, marginBottom: 12 }}>
                      <Text style={styles.resultLabel}>Demographics & Voters</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1F293750', borderRadius: 8, padding: 8 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Population</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{(props.POPULATION || 0).toLocaleString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1F293750', borderRadius: 8, padding: 8 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Voter Turnout</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{props.TURNOUT || 0}%</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1F293750', borderRadius: 8, padding: 8 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>Literacy Rate</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{props.LITERACY || 0}%</Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Contextual trivia */}
                {(() => {
                  const allConstituencyTrivia = getTriviaForConstituencyInState(stateCode, selected.acNo).filter(
                    (t) => !t.contexts.every((c) => c.type === 'GLOBAL'),
                  );
                  const items = selectFreshTrivia(allConstituencyTrivia, 5);
                  return items.length > 0 ? (
                    <View style={styles.triviaRow}>
                      <TriviaCard items={items} compact rotateInterval={6000} />
                    </View>
                  ) : null;
                })()}

                {/* Historical snapshot — all states */}
                {(() => {
                  const pastElections = getHistoryForState(stateCode, selected.acNo);
                  if (pastElections.length === 0) return null;
                  return (
                    <View style={styles.histRow}>
                      {pastElections.map((e) => (
                        <View key={e.year} style={styles.histMiniCard}>
                          <Text style={styles.histMiniYear}>{e.year}</Text>
                          <Text style={styles.histMiniParty}>{e.party}</Text>
                        </View>
                      ))}
                      <View style={[styles.histMiniCard, styles.histMiniCardCurrent]}>
                        <Text style={styles.histMiniYear}>{selected.electionYear}</Text>
                        <Text style={styles.histMiniParty}>{selected.winner}</Text>
                      </View>
                    </View>
                  );
                })()}

                {/* Explore Hierarchy trigger */}
                {!mapOnlyMode && hasHierarchyData(stateCode, selected.acNo) && (
                  <Pressable
                    style={[styles.sheetCompareButton, { borderColor: '#4F8EF750', backgroundColor: '#4F8EF715', marginBottom: 10 }]}
                    onPress={() => {
                      tapLight();
                      bottomSheetRef.current?.close();
                      router.push(`/hierarchy/${stateCode}-AC-${selected.acNo}` as any);
                    }}
                  >
                    <Ionicons name="git-branch" size={16} color="#60A5FA" />
                    <Text style={[styles.sheetCompareText, { color: '#60A5FA' }]}>Explore Hierarchy</Text>
                  </Pressable>
                )}

                {/* Compare on Map trigger */}
                {!mapOnlyMode && (
                  <Pressable
                    style={styles.sheetCompareButton}
                    onPress={() => {
                      tapLight();
                      setMapCompareActive(true);
                      bottomSheetRef.current?.close();
                    }}
                  >
                    <Ionicons name="git-compare" size={16} color="#A78BFA" />
                    <Text style={styles.sheetCompareText}>Compare on Map</Text>
                  </Pressable>
                )}
              </>
            )}
          </BottomSheetView>
        )}
      </BottomSheet>
    </View>
  );
}
