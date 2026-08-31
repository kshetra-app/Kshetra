import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Dimensions,
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
} from '../../lib/constants';
import CandidateAvatar from '../../components/CandidateAvatar';
import { useUserLocation } from '../../lib/useUserLocation';
import { findConstituencyAtPoint, STATES } from '@kshetra/shared';
import { useActiveStateStore } from '../../stores/activeState';
import { usePreferencesStore } from '../../stores/preferences';
import { useFeedStore } from '../../stores/feed';
import { isStateSupported, getStateData } from '../../lib/stateRegistry';
import { MapboxGL, mapboxAvailable } from '../../lib/maplibreCompat';
import { useEnrichedGeo } from '../../lib/useEnrichedGeo';
import { computeDistrictDensityMap } from '../../lib/delimitationDensity';
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
} from '../../lib/mapFillColors';
import StateSwitcher from '../../components/StateSwitcher';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import MapLegend from '../../components/MapLegend';
import MapFallback from '../../components/MapFallback';
import TriviaCard from '../../components/TriviaCard';
import DefectionBadge from '../../components/DefectionBadge';
import MapColorToggle, { type MapColorMode } from '../../components/MapColorToggle';
import MapSearch from '../../components/MapSearch';
import { useTheme } from '../../lib/theme';
import CompareSheet from '../../components/CompareSheet';
import ChiefMinisterBadge from '../../components/ChiefMinisterBadge';
import PhotoViewerModal from '../../components/PhotoViewerModal';
import { useFavoritesStore } from '../../stores/favorites';
import { useMyConstituencyStore } from '../../stores/myConstituency';
import {
  getUnifiedConstituenciesForState,
  getAvailableYearsForState,
  type UnifiedConstituency,
} from '../../lib/stateDataAdapter';
import { getTriviaForConstituencyInState, getAllTriviaForState } from '../../lib/stateTriviaAdapter';
import { getHistoryForState } from '../../lib/stateDataDispatcher';
import { selectFreshTrivia } from '../../lib/triviaSelector';
import { computeAllSeatAllocations } from '../../lib/delimitation/seatCalculator';
import { styles } from '../../lib/mapScreenStyles';
import MapTimeSlider from '../../components/MapTimeSlider';
import { tapLight, selectionChanged } from '../../lib/haptics';
import {
  getLocalizedStateName,
  getLocalizedDistrictName,
  getLocalizedPartyName,
  getLocalizedReservation,
  getLocalizedConstituencyName,
} from '../../lib/stateTranslations';
import { getBoothsForConstituency, hasHierarchyData, hasBoothData } from '../../lib/hierarchyData';
import { useHasRepresentativeData } from '../../lib/representativesData';

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
  localName?: string;
  currentParty?: string;
  electionYear: number;
}

// idleTrivia is now computed per-state inside FullMapScreen

// Dynamic state camera calculations to ensure all states fit perfectly on any device screen
const STATE_BOUNDS_CONFIG: Record<string, { center: [number, number]; zoom: number }> = {
  IN: { center: [78.9629, 22.5937], zoom: 3.6 },
  AP: { center: [80.1500, 15.8500], zoom: 5.8 },
  TS: { center: [79.1151, 17.8495], zoom: 6.7 },
  KA: { center: [76.2000, 15.0000], zoom: 6.1 },
  MH: { center: [76.5000, 19.5000], zoom: 5.8 },
  TN: { center: [78.6569, 11.1271], zoom: 6.3 },
  KL: { center: [76.2711, 10.8505], zoom: 6.8 },
  WB: { center: [87.8550, 22.9868], zoom: 6.3 },
  UP: { center: [80.9462, 26.8467], zoom: 5.7 },
  RJ: { center: [74.2179, 27.0238], zoom: 5.7 },
  GJ: { center: [71.1924, 22.2587], zoom: 6.2 },
  DL: { center: [77.1025, 28.7041], zoom: 9.5 },
  OD: { center: [85.0985, 20.9517], zoom: 6.2 },
  JH: { center: [85.2799, 23.6102], zoom: 6.7 },
};

function getDynamicStateCamera(code: string, geojson?: any): { centerCoordinate: [number, number]; zoomLevel: number } {
  const { width, height } = Dimensions.get('window');
  const usableHeight = Math.max(280, height - 280);
  const usableWidth = Math.max(260, width - 40);

  if (geojson?.features?.length) {
    let minLng = 180, minLat = 90, maxLng = -180, maxLat = -90;
    let count = 0;

    const processCoord = (lng: number, lat: number) => {
      if (typeof lng !== 'number' || typeof lat !== 'number') return;
      if (lng < 60 || lng > 100 || lat < 6 || lat > 40) return;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      count++;
    };

    const traverse = (coords: any) => {
      if (!Array.isArray(coords)) return;
      if (coords.length >= 2 && typeof coords[0] === 'number' && typeof coords[1] === 'number') {
        processCoord(coords[0], coords[1]);
        return;
      }
      for (let i = 0; i < coords.length; i++) traverse(coords[i]);
    };

    for (const f of geojson.features) {
      if (f.geometry?.coordinates) traverse(f.geometry.coordinates);
    }

    if (count > 0 && minLng < maxLng && minLat < maxLat) {
      const center: [number, number] = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
      const dLng = maxLng - minLng;
      const dLat = maxLat - minLat;

      const zoomLng = Math.log2(360 * (usableWidth / 256) / dLng);
      const zoomLat = Math.log2(180 * (usableHeight / 256) / dLat);
      const zoom = Math.max(3.3, Math.min(zoomLng, zoomLat) - 0.2);

      return {
        centerCoordinate: center,
        zoomLevel: Number(zoom.toFixed(2)),
      };
    }
  }

  const s = STATE_BOUNDS_CONFIG[code] ?? { center: getStateCenter(code), zoom: getStateZoom(code) };
  const minDim = Math.min(width, height);
  const sizeAdj = minDim < 360 ? -0.35 : minDim < 400 ? -0.15 : 0.05;
  return {
    centerCoordinate: s.center,
    zoomLevel: Number((s.zoom + sizeAdj).toFixed(2)),
  };
}

export default function MapScreen() {
  if (!mapboxAvailable) return <MapFallback />;
  return <FullMapScreen />;
}

function FullMapScreen() {
  const router = useRouter();
  const { colors } = useTheme();
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
  const hasLocalBodyData = useHasRepresentativeData(stateCode);

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
  const [hideOverlays, setHideOverlays] = useState(false);

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
            props.STATE_NAME_EN = props.STATE_NAME;
            props.STATE_NAME_LOCAL = localized || props.STATE_NAME;
          }
        } else {
          const distName = props.DISTRICT || props.DIST_NAME;
          if (distName) {
            const localized = getLocalizedDistrictName(distName, lang);
            props.DISTRICT_EN = distName;
            props.DISTRICT_LOCAL = localized || distName;
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
        localName: seed?.localName,
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
            nameTe: (b as any).nameTe || '',
            boothNumber: b.boothNumber,
            totalVoters: b.totalVoters ?? 0,
            maleVoters: (b as any).maleVoters ?? null,
            femaleVoters: (b as any).femaleVoters ?? null,
            thirdGenderVoters: (b as any).thirdGenderVoters ?? null,
            isUrban: (b as any).isUrban ?? false,
            wardNumber: (b as any).wardNumber ?? null,
            panchayatId: (b as any).panchayatId ?? null,
            historical: b.historical ?? false,
            sourceYear: b.sourceYear ?? null,
          },
        };
      })
      .filter((f): f is NonNullable<typeof f> => f !== null);

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  }, [selected, currentZoom, stateCode, activeGeoJSON]);

  /** Whether the selected constituency has any booth data to plot — either the
   *  richer official pilot seed or the real 2017-ECI historical locations
   *  (TS + AP). Gates the "Show booths" affordance so we never invite the user
   *  to zoom in on a constituency that has no booth data to reveal. */
  const selectedHasBoothData = useMemo(
    () => (selected ? hasBoothData(stateCode, selected.acNo) : false),
    [selected, stateCode],
  );

  /** Compute the centroid [lng, lat] of a constituency polygon from activeGeoJSON. */
  const getConstituencyCentroid = useCallback(
    (acNo: number): [number, number] | null => {
      if (!activeGeoJSON) return null;
      const feature = activeGeoJSON.features.find(
        (f: any) => Number(f.properties?.AC_NO) === acNo,
      );
      if (!feature?.geometry) return null;
      let sumLng = 0;
      let sumLat = 0;
      let count = 0;
      const walk = (coords: any) => {
        if (Array.isArray(coords[0])) coords.forEach(walk);
        else if (typeof coords[0] === 'number') {
          sumLng += coords[0];
          sumLat += coords[1];
          count++;
        }
      };
      walk(feature.geometry.coordinates);
      return count > 0 ? [sumLng / count, sumLat / count] : null;
    },
    [activeGeoJSON],
  );

  /** Compute the centroid [lng, lat] of any GeoJSON feature geometry */
  const getFeatureCentroid = useCallback((feature: any): [number, number] | null => {
    if (!feature?.geometry?.coordinates) return null;
    let sumLng = 0;
    let sumLat = 0;
    let count = 0;
    const walk = (coords: any) => {
      if (Array.isArray(coords[0])) {
        coords.forEach(walk);
      } else if (typeof coords[0] === 'number') {
        sumLng += coords[0];
        sumLat += coords[1];
        count++;
      }
    };
    walk(feature.geometry.coordinates);
    return count > 0 ? [sumLng / count, sumLat / count] : null;
  }, []);

  /** Fly the camera down to booth-reveal zoom, centred on the selected AC. */
  const flyToBooths = useCallback(() => {
    if (!selected) return;
    tapLight();
    const center = getConstituencyCentroid(selected.acNo);
    cameraRef.current?.setCamera({
      centerCoordinate: center ?? undefined,
      zoomLevel: BOOTH_ZOOM_THRESHOLD + 0.6,
      pitch: is3DMode ? 55 : 0,
      animationDuration: 900,
    });
  }, [selected, getConstituencyCentroid, is3DMode, BOOTH_ZOOM_THRESHOLD]);

  const lastPressTimeRef = useRef(0);

  const handleMapPress = useCallback(
    (event: any) => {
      const now = Date.now();
      if (now - lastPressTimeRef.current < 250) return;
      lastPressTimeRef.current = now;

      // Extract tap coordinates from MapLibre / @rnmapbox event formats
      let lng: number | undefined;
      let lat: number | undefined;

      const raw = event?.nativeEvent ?? event;

      if (raw?.geometry?.coordinates && Array.isArray(raw.geometry.coordinates)) {
        [lng, lat] = raw.geometry.coordinates;
      } else if (raw?.coordinates && Array.isArray(raw.coordinates)) {
        [lng, lat] = raw.coordinates;
      } else if (raw?.coordinate && Array.isArray(raw.coordinate)) {
        [lng, lat] = raw.coordinate;
      } else if (raw?.lngLat && Array.isArray(raw.lngLat) && raw.lngLat.length >= 2) {
        [lng, lat] = raw.lngLat;
      } else if (raw?.lngLat && typeof raw.lngLat === 'object') {
        lng = raw.lngLat.lng ?? raw.lngLat.longitude;
        lat = raw.lngLat.lat ?? raw.lngLat.latitude;
      } else if (raw?.coordinate && typeof raw.coordinate === 'object') {
        lng = raw.coordinate.longitude ?? raw.coordinate.lng;
        lat = raw.coordinate.latitude ?? raw.coordinate.lat;
      } else if (raw?.coordinates && typeof raw.coordinates === 'object') {
        lng = raw.coordinates.longitude ?? raw.coordinates.lng;
        lat = raw.coordinates.latitude ?? raw.coordinates.lat;
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

        if (currentZoom >= BOOTH_ZOOM_THRESHOLD) {
          // At booth level, map presses should NOT navigate to constituency page
          if (selectedRef.current?.acNo === acNo) {
            if (selectedBooth) {
              setSelectedBooth(null);
            }
            return;
          }
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

      let hitFeature: any = null;

      // ── PRIORITY 1: Mathematical Point-in-Polygon (Exact Boundary Hit Test) ──
      // Evaluates whether the tapped (lng, lat) is truly within the polygon boundary.
      // This is mathematically 100% exact and completely eliminates bounding-box false
      // positives (e.g. clicking Telangana when Maharashtra's bounding box encloses it).
      if (lng != null && lat != null && activeGeoJSON) {
        const found = findConstituencyAtPoint(lng, lat, activeGeoJSON);
        if (found) {
          hitFeature = activeGeoJSON.features[found.index];
        }
      }

      // ── PRIORITY 2: If tap fell on a border sliver, pick candidate closest to tap coordinate ──
      if (!hitFeature && event?.features?.length) {
        if (lng != null && lat != null) {
          let bestDist = Infinity;
          let bestFeature = event.features[0];
          for (const f of event.features) {
            const centroid = getConstituencyCentroid(Number(f.properties?.AC_NO)) ??
              (f.geometry ? getFeatureCentroid(f) : null);
            if (centroid) {
              const d = Math.hypot(centroid[0] - lng, centroid[1] - lat);
              if (d < bestDist) {
                bestDist = d;
                bestFeature = f;
              }
            }
          }
          hitFeature = bestFeature;
        } else {
          hitFeature = event.features[0];
        }
      }

      if (!hitFeature) return;

      // National View: navigate to the selected state
      if (stateCode === 'IN') {
        const code = hitFeature.properties?.STATE_CODE;
        if (code) {
          tapLight();
          setStateCode(code);
        }
        return;
      }

      // State View: select the constituency
      const acNo = Number(hitFeature.properties?.AC_NO);
      const acName = hitFeature.properties?.AC_NAME ?? '';
      const distName = hitFeature.properties?.DIST_NAME ?? hitFeature.properties?.DISTRICT ?? '';

      if (acNo) {
        processDirectSelect(acNo, acName, distName, lng, lat);
      }
    },
    [
      selectConstituency,
      router,
      activeGeoJSON,
      mapCompareActive,
      getSelectedConstituencyObject,
      stateCode,
      setStateCode,
      currentZoom,
      BOOTH_ZOOM_THRESHOLD,
      selectedBooth,
      getConstituencyCentroid,
      getFeatureCentroid,
    ],
  );

  // Update camera pitch & bearing dynamically when 3D mode is toggled for realistic isometric 3D depth
  useEffect(() => {
    cameraRef.current?.setCamera({
      pitch: is3DMode ? 48 : 0,
      heading: is3DMode ? 350 : 0,
      animationDuration: 700,
    });
  }, [is3DMode]);

  // Fly camera to new state with dynamic bounding box fitting to device screen
  useEffect(() => {
    setSelected(null);
    setCompareSelected(null);
    setMapCompareActive(false);
    setFocusedDistrict('');
    bottomSheetRef.current?.close();

    const years = getAvailableYearsForState(stateCode);
    setSelectedYear(years[years.length - 1]);
    setSelectedBooth(null);

    const cam = getDynamicStateCamera(stateCode, activeGeoJSON);
    setCurrentZoom(cam.zoomLevel);

    cameraRef.current?.setCamera({
      centerCoordinate: cam.centerCoordinate,
      zoomLevel: cam.zoomLevel,
      pitch: is3DMode ? 48 : 0,
      animationDuration: 800,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateCode]);

  // When activeGeoJSON loads, dynamically frame the entire state geometry to the device screen
  useEffect(() => {
    if (activeGeoJSON?.features?.length && !selected && !mapCompareActive) {
      const cam = getDynamicStateCamera(stateCode, activeGeoJSON);
      setCurrentZoom(cam.zoomLevel);
      cameraRef.current?.setCamera({
        centerCoordinate: cam.centerCoordinate,
        zoomLevel: cam.zoomLevel,
        pitch: is3DMode ? 48 : 0,
        animationDuration: 600,
      });
    }
  }, [activeGeoJSON, stateCode]);

  const handleReset = useCallback(() => {
    tapLight();

    // Step-by-step "back" that unwinds the map hierarchy one level per press
    // (booth popup → booth zoom → constituency → district/compare → state →
    // India) instead of jumping straight to the national map.

    // 1. A booth popup is open → just dismiss it.
    if (selectedBooth) {
      setSelectedBooth(null);
      return;
    }

    // 2. Zoomed into the booth-reveal level → pull back to the state overview
    //    while keeping the constituency selection.
    if (selected && currentZoom >= BOOTH_ZOOM_THRESHOLD) {
      const cam = getDynamicStateCamera(stateCode, activeGeoJSON);
      cameraRef.current?.setCamera({
        centerCoordinate: cam.centerCoordinate,
        zoomLevel: cam.zoomLevel,
        pitch: is3DMode ? 48 : 0,
        animationDuration: 600,
      });
      return;
    }

    // 3. A constituency is selected (bottom sheet) → clear it, back to state.
    if (selected) {
      setSelected(null);
      setUserMarker(null);
      bottomSheetRef.current?.close();
      return;
    }

    // 4. Compare mode / district focus overlays → clear them.
    if (mapCompareActive || compareSelected || focusedDistrict !== '') {
      setCompareSelected(null);
      setMapCompareActive(false);
      setFocusedDistrict('');
      return;
    }

    // 5. Inside a state → back to the national (India) map.
    if (stateCode !== 'IN') {
      setStateCode('IN');
      return;
    }

    // 6. Already at India → recentre the national view.
    const cam = getDynamicStateCamera('IN', activeGeoJSON);
    cameraRef.current?.setCamera({
      centerCoordinate: cam.centerCoordinate,
      zoomLevel: cam.zoomLevel,
      pitch: is3DMode ? 48 : 0,
      animationDuration: 600,
    });
  }, [
    stateCode,
    setStateCode,
    selected,
    selectedBooth,
    currentZoom,
    is3DMode,
    mapCompareActive,
    compareSelected,
    focusedDistrict,
    activeGeoJSON,
  ]);

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
  const mapTopOffset = Math.max(insets.top, 24);

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
            centerCoordinate: getDynamicStateCamera(stateCode, activeGeoJSON).centerCoordinate,
            zoomLevel: getDynamicStateCamera(stateCode, activeGeoJSON).zoomLevel,
            padding: { paddingTop: 80, paddingBottom: 40, paddingLeft: 16, paddingRight: 16 },
          }}
          pitch={is3DMode ? 48 : 0}
          minZoomLevel={stateCode === 'IN' ? 2.5 : 4.2}
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
                    // Always render region labels regardless of zoom/collision so
                    // state (India view) and district (state view) names are
                    // visible in the default/zoomed-out state, not only after
                    // zooming in. `symbolZElevate` is Mapbox-GL-only and breaks
                    // MapLibre parsing, so it is intentionally omitted.
                    textAllowOverlap: true,
                    textIgnorePlacement: true,
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
        <View style={[styles.header, { top: mapTopOffset }]} pointerEvents="box-none">
          <View style={styles.headerTop}>
            <View style={{ flex: 1, marginRight: 8, justifyContent: 'center' }}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {t('common.appName')}
              </Text>
              <Text style={styles.headerSubtitle} numberOfLines={1}>
                {stateCode === 'IN'
                  ? t('mapExtended.nationalOverview')
                  : `${getLocalizedStateName(stateCode, i18n.language) || currentState?.name || stateCode} · ${currentState?.assemblySeats ?? '?'} ${t('explore.constituencies')}`}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {/* Full Map / Clean view toggle */}
              <Pressable
                style={{
                  backgroundColor: hideOverlays ? colors.gold : colors.primary,
                  borderRadius: 14,
                  paddingHorizontal: 8,
                  paddingVertical: 5,
                  borderWidth: 1,
                  borderColor: colors.goldBorder || '#C5A059',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  shadowColor: colors.shadowColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 3,
                  elevation: 4,
                }}
                onPress={() => {
                  tapLight();
                  setHideOverlays((v) => !v);
                }}
              >
                <Ionicons
                  name={hideOverlays ? 'eye' : 'expand-outline'}
                  size={13}
                  color="#FFFFFF"
                />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    letterSpacing: 0.3,
                  }}
                >
                  {hideOverlays ? 'UI' : 'Full'}
                </Text>
              </Pressable>
              <StateSwitcher />
              <LanguageSwitcher compact />
            </View>
          </View>

          {/* Prime Minister (National) / Chief Minister (State) Leader badge */}
          {!hideOverlays && !selected && (
            <View style={{ marginTop: 4, marginRight: 54 }}>
              <ChiefMinisterBadge stateCode={stateCode} compact />
            </View>
          )}

          {/* Thematic Color Mode Toggle (Full Width — No Overlap) */}
          {stateCode !== 'IN' && (
            <View style={{ marginTop: 5, marginRight: 54 }}>
              <MapColorToggle mode={colorMode} onModeChange={setColorMode} />
            </View>
          )}

          {/* Booth-zoom discoverability hint */}
          {selected && selectedHasBoothData && !selectedBooth && currentZoom < BOOTH_ZOOM_THRESHOLD && (
            <Pressable
              onPress={flyToBooths}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: 'rgba(15,23,42,0.95)',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: '#4F8EF780',
                paddingVertical: 6,
                paddingHorizontal: 10,
                marginTop: 6,
                marginRight: 54,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 5,
                elevation: 7,
              }}
            >
              <Ionicons name="layers-outline" size={15} color="#60A5FA" />
              <Text style={{ flex: 1, color: '#E2E8F0', fontSize: 11, fontWeight: '700', marginLeft: 8 }} numberOfLines={1}>
                {t('mapExtended.zoomForBooths')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', borderRadius: 6, paddingVertical: 3, paddingHorizontal: 6 }}>
                <Ionicons name="scan-outline" size={11} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700', marginLeft: 3 }}>{t('mapExtended.show')}</Text>
              </View>
            </Pressable>
          )}
        </View>
      )}

      {/* Floating Draggable Map Legend (Moved downwards, fully movable anywhere on screen) */}
      {!broadcastMode && !selectedBooth && (
        <MapLegend
          colorMode={colorMode}
          stateCode={stateCode}
          initialTop={mapTopOffset + (!hideOverlays && !selected && stateCode !== 'IN' ? 148 : 98)}
        />
      )}

      {/* Floating Detailed Polling Booth Card (Full Available Details) */}
      {selectedBooth && (
        <View
          style={{
            position: 'absolute',
            bottom: 24,
            left: 14,
            right: 14,
            backgroundColor: 'rgba(15, 23, 42, 0.98)',
            borderRadius: 18,
            padding: 16,
            borderWidth: 1.5,
            borderColor: '#FF3B30',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.45,
            shadowRadius: 8,
            elevation: 12,
            zIndex: 99,
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 }}>
                  BOOTH #{selectedBooth.boothNumber}
                </Text>
              </View>
              <View style={{ backgroundColor: '#1E293B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#94A3B8' }}>
                  {selectedBooth.isUrban ? `URBAN ${selectedBooth.wardNumber ? `· WARD ${selectedBooth.wardNumber}` : ''}` : 'RURAL GRAM PANCHAYAT'}
                </Text>
              </View>
              {selectedBooth.historical && (
                <View style={{ backgroundColor: '#78350F40', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#F59E0B50' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: '#FCD34D' }}>ECI {selectedBooth.sourceYear ?? 2017}</Text>
                </View>
              )}
            </View>
            <Pressable onPress={() => setSelectedBooth(null)} hitSlop={10} style={{ padding: 2 }}>
              <Ionicons name="close-circle" size={24} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Name & Regional Name */}
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>
            {selectedBooth.name}
          </Text>
          {selectedBooth.nameTe ? (
            <Text style={{ fontSize: 13, color: '#FCD34D', marginTop: 2 }}>
              {selectedBooth.nameTe}
            </Text>
          ) : null}

          {/* Stats Breakdown */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ fontSize: 10, color: '#94A3B8', fontWeight: '600' }}>{t('mapExtended.registeredVoters')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginTop: 2 }}>
                {(selectedBooth.totalVoters || 0).toLocaleString()}
              </Text>
            </View>
            {(selectedBooth.maleVoters != null || selectedBooth.femaleVoters != null) && (
              <>
                <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ fontSize: 10, color: '#60A5FA', fontWeight: '600' }}>Male Voters</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#60A5FA', marginTop: 2 }}>
                    {(selectedBooth.maleVoters || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#1E293B', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#334155' }}>
                  <Text style={{ fontSize: 10, color: '#F472B6', fontWeight: '600' }}>Female Voters</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#F472B6', marginTop: 2 }}>
                    {(selectedBooth.femaleVoters || 0).toLocaleString()}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Action to explore Hierarchy */}
          {selected && (
            <Pressable
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#3B82F625',
                borderWidth: 1,
                borderColor: '#3B82F680',
                borderRadius: 10,
                paddingVertical: 9,
                marginTop: 12,
                gap: 6,
              }}
              onPress={() => {
                tapLight();
                router.push(`/hierarchy/${stateCode}-AC-${selected.acNo}` as any);
              }}
            >
              <Ionicons name="git-branch" size={15} color="#60A5FA" />
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#60A5FA' }}>
                Explore Hierarchy of this Booth
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Action buttons with Short Crisp Titles on the right */}
      {!broadcastMode && (
        <View style={[styles.actionButtons, { top: mapTopOffset + (stateCode === 'IN' ? 55 : 62) }]}>
          {stateCode !== 'IN' && (
            <View style={styles.actionItem}>
              <Pressable
                style={[styles.actionButton, styles.searchButton]}
                onPress={() => setShowSearch(true)}
              >
                <Ionicons name="search" size={19} color="#60A5FA" />
              </Pressable>
              <Text style={styles.actionButtonLabel}>Search</Text>
            </View>
          )}

          {stateCode !== 'IN' && (
            <View style={styles.actionItem}>
              <Pressable
                style={[styles.actionButton, styles.compareButton]}
                onPress={() => setShowCompare(true)}
              >
                <Ionicons name="git-compare" size={19} color="#A78BFA" />
              </Pressable>
              <Text style={styles.actionButtonLabel}>Compare</Text>
            </View>
          )}

          {(selected || mapCompareActive || focusedDistrict !== '' || stateCode !== 'IN') && (
            <View style={styles.actionItem}>
              <Pressable style={[styles.actionButton, styles.resetButton]} onPress={handleReset}>
                <Ionicons name="refresh" size={19} color="#F1F5F9" />
              </Pressable>
              <Text style={styles.actionButtonLabel}>Reset</Text>
            </View>
          )}

          {/* 3D Extrusion Toggle */}
          <View style={styles.actionItem}>
            <Pressable
              style={[styles.actionButton, is3DMode && styles.activeButton]}
              onPress={() => {
                tapLight();
                setIs3DMode((v) => !v);
              }}
            >
              <Ionicons name="cube" size={19} color={is3DMode ? '#FCD34D' : '#FFFFFF'} />
            </Pressable>
            <Text style={[styles.actionButtonLabel, is3DMode && { color: '#FCD34D' }]}>3D View</Text>
          </View>

          {/* District Focus Toggle */}
          {stateCode !== 'IN' && (
            <View style={styles.actionItem}>
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
                  size={19}
                  color={focusedDistrict !== '' ? '#FCD34D' : selected ? '#FFFFFF' : '#475569'}
                />
              </Pressable>
              <Text style={[styles.actionButtonLabel, focusedDistrict !== '' && { color: '#FCD34D' }]}>District</Text>
            </View>
          )}

          {/* Delimitation / Seat Density Toggle */}
          {stateCode !== 'IN' && (
            <View style={styles.actionItem}>
              <Pressable
                style={[
                  styles.actionButton,
                  showDelimitation && styles.delimButtonActive,
                ]}
                onPress={() => setShowDelimitation((v) => !v)}
              >
                <Ionicons name="layers" size={19} color={showDelimitation ? '#34D399' : '#FFFFFF'} />
              </Pressable>
              <Text style={[styles.actionButtonLabel, showDelimitation && { color: '#34D399' }]}>Density</Text>
            </View>
          )}

          {/* Locate Me */}
          <View style={styles.actionItem}>
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
                <Ionicons name="navigate" size={19} color="#FFFFFF" />
              )}
            </Pressable>
            <Text style={styles.actionButtonLabel}>Locate</Text>
          </View>
        </View>
      )}



      {/* Delimitation overlay info bar */}
      {!broadcastMode && showDelimitation && stateProjection && (
        <View style={styles.delimBar}>
          <View style={styles.delimBarTop}>
            <Ionicons name="layers" size={14} color="#FCD34D" />
            <Text style={styles.delimBarTitle}>{t('mapExtended.seatDensityOverlay')}</Text>
            <Text style={styles.delimBarBadge}>{t('mapExtended.projected')}</Text>
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
            <Text style={[styles.delimBarLbl, { color: '#EF4444' }]}>{t('mapExtended.underRepresented')}</Text>
            <View style={styles.delimBarSpacer} />
            <Text style={styles.delimBarStat}>{stateProjection.currentSeats}</Text>
            <Ionicons name="arrow-forward" size={12} color="#FCD34D" />
            <Text style={[styles.delimBarStat, { color: '#10B981' }]}>{stateProjection.projectedSeats}</Text>
            <View style={styles.delimBarSpacer} />
            <Text style={[styles.delimBarLbl, { color: '#22C55E' }]}>{t('mapExtended.overRepresented')}</Text>
          </View>
          <Pressable onPress={() => router.push('/delimitation' as any)}>
            <Text style={styles.delimBarLink}>{t('mapExtended.viewFullAnalysis')}</Text>
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
                {t('mapExtended.hubFeed')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.spatialHubTab, spatialTab === 'stats' && styles.spatialHubTabActive]}
              onPress={() => setSpatialTab('stats')}
            >
              <Text style={[styles.spatialHubTabText, spatialTab === 'stats' && styles.spatialHubTabTextActive]}>
                {t('mapExtended.hubAnalytics')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.spatialHubTab, spatialTab === 'list' && styles.spatialHubTabActive]}
              onPress={() => setSpatialTab('list')}
            >
              <Text style={[styles.spatialHubTabText, spatialTab === 'list' && styles.spatialHubTabTextActive]}>
                {stateCode === 'IN' ? t('mapExtended.hubStates') : t('mapExtended.hubConstituencies')}
              </Text>
            </Pressable>
          </View>

          {/* Spatial Hub Content */}
          {spatialTab === 'feed' && (
            <ScrollView style={styles.spatialHubScroll}>
              {spatialPosts.length === 0 ? (
                <Text style={styles.spatialHubEmpty}>{t('mapExtended.noFeedPosts')}</Text>
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
                        <Text style={styles.spatialHubRowSubtitle}>{t('mapExtended.rulesStates', { count })}</Text>
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
                    return <Text style={styles.spatialHubEmpty}>{t('mapExtended.noStatistics')}</Text>;
                  }
                  return sorted.map(([party, count]) => (
                    <View key={party} style={styles.spatialHubRow}>
                      <View style={[styles.spatialHubDot, { backgroundColor: getPartyColor(party) }]} />
                      <View style={styles.spatialHubRowInfo}>
                        <Text style={styles.spatialHubRowTitle}>{party}</Text>
                        <Text style={styles.spatialHubRowSubtitle}>{count} {t('mapExtended.seatsWonLeading')}</Text>
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
                          {state.assemblySeats} {t('mapExtended.constituenciesRuledBy')} {state.rulingParty}
                        </Text>
                      </View>
                      <View style={styles.spatialHubBadge}>
                        <Text style={styles.spatialHubBadgeText}>{supported ? t('mapExtended.statusActive') : t('mapExtended.statusStub')}</Text>
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
                      <Text style={styles.spatialHubRowTitle}>
                        {getLocalizedConstituencyName(c.acNo, stateCode, c.name, i18n.language, c.localName)}
                      </Text>
                      <Text style={styles.spatialHubRowSubtitle}>
                        AC #{c.acNo} · {getLocalizedDistrictName(c.district, i18n.language)}
                      </Text>
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}

      {/* Bottom Dashboard: stacks timeline slider, idle trivia, and home button dynamically */}
      {!broadcastMode && !mapOnlyMode && !selected && !selectedBooth && !showDelimitation && !mapCompareActive && hasBottomContent && !hideOverlays && (
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
            <Text style={styles.compareTitle}>{t('mapExtended.constituencyComparison')}</Text>
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
              <Text style={styles.compareStatLabel}>{t('mapExtended.margin')}</Text>
              <Text style={styles.compareStatValue}>{(selected.margin ?? 0).toLocaleString()} {t('mapExtended.votes')}</Text>
              <Text style={styles.compareStatLabel}>{t('mapExtended.winnerVotes')}</Text>
              <Text style={styles.compareStatValue}>{(selected.votes ?? 0).toLocaleString()}</Text>
            </View>

            {/* Right Seat */}
            {compareSelected ? (
              <View style={[styles.compareCol, styles.compareColRight]}>
                <Text style={styles.compareSeatName} numberOfLines={1}>{compareSelected.name ?? ''}</Text>
                <Text style={styles.compareParty}>{compareSelected.winner ?? 'IND'} (AC #{compareSelected.acNo ?? -1})</Text>
                <Text style={styles.compareStatLabel}>{t('mapExtended.margin')}</Text>
                <Text style={styles.compareStatValue}>{(compareSelected.margin ?? 0).toLocaleString()} {t('mapExtended.votes')}</Text>
                <Text style={styles.compareStatLabel}>{t('mapExtended.winnerVotes')}</Text>
                <Text style={styles.compareStatValue}>{(compareSelected.votes ?? 0).toLocaleString()}</Text>
              </View>
            ) : (
              <View style={styles.compareCol}>
                <Text style={[styles.compareSeatName, { color: '#9CA3AF', fontSize: 13, fontStyle: 'italic', marginTop: 10, textAlign: 'center' }]}>
                  {t('mapExtended.tapToCompare')}
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
                <Text style={styles.partyBadgeText}>
                  {getLocalizedPartyName(selected.winner, i18n.language) || selected.winner}
                </Text>
              </View>
              <View style={styles.sheetTitleGroup}>
                <Text style={styles.sheetTitle}>
                  {getLocalizedConstituencyName(selected.acNo, stateCode, selected.name, i18n.language, selected.localName)}
                </Text>
                <Text style={styles.sheetSubtitle}>
                  AC #{selected.acNo} · {getLocalizedDistrictName(selected.district, i18n.language)} · {getLocalizedReservation(selected.type, i18n.language)}
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
                    {t('constituencyExtended.mlaProfile')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.spatialHubTab, sheetTab === 'feed' && styles.spatialHubTabActive]}
                  onPress={() => setSheetTab('feed')}
                >
                  <Text style={[styles.spatialHubTabText, sheetTab === 'feed' && styles.spatialHubTabTextActive]}>
                    {t('mapExtended.hubFeed')}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.spatialHubTab, sheetTab === 'analytics' && styles.spatialHubTabActive]}
                  onPress={() => setSheetTab('analytics')}
                >
                  <Text style={[styles.spatialHubTabText, sheetTab === 'analytics' && styles.spatialHubTabTextActive]}>
                    {t('mapExtended.hubAnalytics')}
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
                    <Text style={styles.statValue}>
                      {getLocalizedPartyName(selected.runnerUp, i18n.language) || selected.runnerUp}
                    </Text>
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
                    <Text style={styles.spatialHubEmpty}>{t('constituencyExtended.noDiscussions')}</Text>
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
                      <Text style={styles.resultLabel}>{t('mapExtended.demographicsVoters')}</Text>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1F293750', borderRadius: 8, padding: 8 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('mapExtended.population')}</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{(props.POPULATION || 0).toLocaleString()}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1F293750', borderRadius: 8, padding: 8 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('mapExtended.voterTurnout')}</Text>
                        <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>{props.TURNOUT || 0}%</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#1F293750', borderRadius: 8, padding: 8 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 12 }}>{t('mapExtended.literacyRate')}</Text>
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
                    <Text style={[styles.sheetCompareText, { color: '#60A5FA' }]}>{t('constituencyExtended.exploreHierarchyButton')}</Text>
                  </Pressable>
                )}

                {/* Local Bodies trigger — rural GP reps (Sarpanch + Ward members) */}
                {!mapOnlyMode && hasLocalBodyData && (
                  <Pressable
                    style={[styles.sheetCompareButton, { borderColor: '#EC489950', backgroundColor: '#EC489915', marginBottom: 10 }]}
                    onPress={() => {
                      tapLight();
                      bottomSheetRef.current?.close();
                      router.push('/local-bodies' as any);
                    }}
                  >
                    <Ionicons name="home" size={16} color="#F472B6" />
                    <Text style={[styles.sheetCompareText, { color: '#F472B6' }]}>{t('exploreExtended.localBodies')}</Text>
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
                    <Text style={styles.sheetCompareText}>{t('constituencyExtended.compareOnMap')}</Text>
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
