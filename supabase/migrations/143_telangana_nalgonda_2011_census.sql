-- Census 2011, erstwhile Nalgonda district, PCA TV (PC11_PCA-TV-2808).
-- ECI's 2008 order defines ACs 86–97 as whole mandals. These twelve seats
-- account for all 59 distinct Census subdistricts and reproduce district totals.
-- Literacy uses residents aged seven or older. Other shares use total population.
BEGIN;
DO $census$
DECLARE row_total integer;
BEGIN
  WITH calculated (ac_no, population, urban_pct, literacy_pct, sc_pct, st_pct, mandal_codes) AS (
    VALUES
      (86, 292568, 13.47, 55.53, 15.77, 31.12, ARRAY['04650', '04651', '04652', '04653', '04658']::text[]),
      (87, 275422, 5.77, 59.17, 17.94, 17.87, ARRAY['04657', '04661', '04659', '04660', '04662']::text[]),
      (88, 287323, 36.52, 67.52, 15.29, 18.36, ARRAY['04644', '04664', '04663']::text[]),
      (89, 302725, 0.00, 62.64, 16.98, 13.97, ARRAY['04665', '04666', '04669', '04670', '04671']::text[]),
      (90, 299646, 21.44, 66.17, 19.49, 9.84, ARRAY['04640', '04641', '04642', '04667', '04668']::text[]),
      (91, 293851, 36.35, 67.21, 18.79, 15.34, ARRAY['04622', '04638', '04639', '04643']::text[]),
      (92, 291884, 52.87, 74.25, 18.56, 1.38, ARRAY['04645', '04646', '04656']::text[]),
      (93, 290229, 10.33, 61.25, 17.72, 6.74, ARRAY['04647', '04648', '04649', '04654', '04655', '04631']::text[]),
      (94, 259195, 28.79, 68.17, 16.72, 3.82, ARRAY['04628', '04629', '04627', '04630']::text[]),
      (95, 303120, 17.51, 65.85, 21.39, 1.18, ARRAY['04632', '04633', '04635', '04636', '04637', '04634']::text[]),
      (96, 306107, 0.00, 59.94, 22.27, 8.29, ARRAY['04619', '04620', '04621', '04623', '04624', '04625']::text[]),
      (97, 286739, 6.71, 62.67, 17.76, 7.68, ARRAY['04614', '04615', '04616', '04617', '04618', '04626', '04613']::text[])
  )
  UPDATE public.constituency_demographics d
  SET total_population = calculated.population,
      urban_percentage = calculated.urban_pct,
      literacy_rate = calculated.literacy_pct,
      sc_percentage = calculated.sc_pct,
      st_percentage = calculated.st_pct,
      metadata = jsonb_set(d.metadata, '{census_statistics}', jsonb_build_object(
        'status', 'DERIVED',
        'year', 2011,
        'source_url', 'https://censusindia.gov.in/nada/index.php/catalog/6730',
        'boundary_url', 'https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf',
        'mandal_codes', calculated.mandal_codes,
        'workbook_sha256', '9402dec069b5889e6a0ee6d05f29aa42b101308ccbd95f1e241d574b25427bae'
      ), true),
      updated_at = now()
  FROM calculated
  JOIN public.constituencies c ON c.state_code = 'TS' AND c.ac_no = calculated.ac_no
  WHERE d.state_code = 'TS' AND d.election_year = 2023
    AND d.ac_no = calculated.ac_no AND d.constituency_id = c.internal_id
    AND d.metadata->'electoral_statistics'->>'status' = 'OFFICIAL'
    AND (
      NOT (d.metadata ? 'census_statistics')
      OR d.metadata->'census_statistics'->>'source_url' = 'https://censusindia.gov.in/nada/index.php/catalog/6730'
    );
  GET DIAGNOSTICS row_total = ROW_COUNT;
  IF row_total <> 12 THEN
    RAISE EXCEPTION 'Expected 12 matched Telangana Census records, found %', row_total;
  END IF;
END $census$;

COMMIT;
