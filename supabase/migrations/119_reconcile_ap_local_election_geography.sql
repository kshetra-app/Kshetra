BEGIN;

-- APSEC published the 2021 Gram Panchayat, MPTC and ZPTC returns separately.
-- These aliases join the same election geography while preserving the original record IDs and sources.
-- District names and expanded mandal abbreviations corroborated with Andhra Pradesh government directories.
CREATE OR REPLACE FUNCTION public.normalize_ap_2021_election_directory()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.representatives
  SET district = 'Anantapuramu', district_slug = 'anantapuramu'
  WHERE state_code = 'AP' AND election_year = 2021 AND source_type = 'sec'
    AND data_status = 'verified'
    AND district_slug IN ('ananthapuram', 'ananthapuramu');

  WITH aliases(district_slug, alias, canonical) AS (
    VALUES
      ('anantapuramu', 'anantapur-rural', 'anantapur'),
      ('anantapuramu', 'bathalapalli', 'bathalapalle'),
      ('anantapuramu', 'bukkarayasamudram', 'bukkaraya-samudram'),
      ('anantapuramu', 'chennekotha-palli', 'chennekothapalle'),
      ('anantapuramu', 'kanaganapalli', 'kanaganapalle'),
      ('anantapuramu', 'np-kunta', 'nambulipulikunta'),
      ('anantapuramu', 'od-cheruvu', 'obuladevaracheruvu'),
      ('anantapuramu', 'puttaparthy', 'puttaparthi'),
      ('anantapuramu', 'rapthadu', 'raptadu'),
      ('anantapuramu', 'somandepalli', 'somandepalle'),
      ('anantapuramu', 'tadipatri', 'tadpatri'),
      ('anantapuramu', 'tanakallu', 'tanakal'),
      ('chittoor', 'b-n-kandriga', 'buchinaidu-kandriga'),
      ('chittoor', 'g-d-nellore', 'gangadhara-nellore'),
      ('chittoor', 'k-v-palli', 'kambhamvaripalle'),
      ('chittoor', 'kvb-puram', 'k-v-b-puram'),
      ('chittoor', 'peddathippasamudram', 'pedda-thippasamudram'),
      ('chittoor', 'penumur', 'penumuru'),
      ('chittoor', 'piler', 'pileru'),
      ('chittoor', 'sathyavedu', 'satyavedu'),
      ('chittoor', 'thavanampalli', 'thavanampalle'),
      ('chittoor', 'v-kota', 'venkatagirikota'),
      ('chittoor', 'veduru-kuppam', 'vedurukuppam'),
      ('chittoor', 'yadamari', 'yadamarri'),
      ('east-godavari', 'anaparthi', 'anaparthy'),
      ('east-godavari', 'chintoor', 'chintur'),
      ('east-godavari', 'gandepalli', 'gandepalle'),
      ('east-godavari', 'gangavaram-agency', 'gangavaram'),
      ('east-godavari', 'sakhinetipalli', 'sakhinetipalle'),
      ('east-godavari', 'samalkot', 'samalkota'),
      ('east-godavari', 'tallarevu', 'thallarevu'),
      ('east-godavari', 'vararamachandrapura-m', 'vararamachandrapuram'),
      ('guntur', 'cherukupalle', 'cherukupalle-h-o-arumbaka'),
      ('guntur', 'chilakaluripet', 'chilakaluripet-h-o-purushotha-patnam'),
      ('guntur', 'savalyapuram', 'savalyapuram-h-o-kanamarlapudi'),
      ('krishna', 'agiripalli', 'agiripalle'),
      ('krishna', 'challapalli', 'challapalle'),
      ('krishna', 'gudlvalleru', 'gudlavalleru'),
      ('krishna', 'kaikaluru', 'kaikalur'),
      ('krishna', 'mudinepalli', 'mudinepalle'),
      ('krishna', 'vissannapeta', 'vissannapet'),
      ('kurnool', 'devanaonda', 'devanakonda'),
      ('kurnool', 'jupadu-bunglow', 'jupadu-bungalow'),
      ('kurnool', 'kothapalli', 'kothapalle'),
      ('kurnool', 'maddikera', 'maddikera-east'),
      ('kurnool', 'peapully', 'peapally'),
      ('kurnool', 'peddakadabur', 'pedda-kadubur'),
      ('kurnool', 'veldurthy', 'veldurthi'),
      ('kurnool', 'velugodu', 'velgode'),
      ('prakasam', 'besthavaripeta', 'bestawaripeta'),
      ('prakasam', 'c-s-puram', 'chandra-sekhara-puram'),
      ('prakasam', 'chimakurthy', 'chimakurthi'),
      ('prakasam', 'chinnaganjam', 'chinaganjam'),
      ('prakasam', 'giddaluru', 'giddalur'),
      ('prakasam', 'gudlur', 'gudluru'),
      ('prakasam', 'hanumanthunipadu', 'hanumanthuni-padu'),
      ('prakasam', 'j-pangulur', 'janakavarampanguluru'),
      ('prakasam', 'kothapatnam', 'kotha-patnam'),
      ('prakasam', 'mundlamur', 'mundlamuru'),
      ('prakasam', 'naguluppalapadu', 'naguluppala-padu'),
      ('prakasam', 'pcpalli', 'pedacherlo-palle'),
      ('prakasam', 'peddaraveedu', 'peda-araveedu'),
      ('prakasam', 'ponnalur', 'ponnaluru'),
      ('prakasam', 's-n-padu', 'santhanuthala-padu'),
      ('prakasam', 'yeddanapudi', 'yeddana-pudi'),
      ('spsr-nellore', 'as-peta', 'anumasamudrampeta'),
      ('spsr-nellore', 'balayapalli', 'balayapalle'),
      ('spsr-nellore', 'buchireddypalem', 'buchireddipalem'),
      ('spsr-nellore', 'duttaluru', 'duttalur'),
      ('spsr-nellore', 'naidupeta', 'naidupet'),
      ('spsr-nellore', 'ozili', 'ojili'),
      ('spsr-nellore', 'sullurupet', 'sullurpeta'),
      ('spsr-nellore', 'tp-gudur', 'thotapalligudur'),
      ('spsr-nellore', 'vk-padu', 'varikuntapadu'),
      ('srikakulam', 'g-sigadam', 'ganguvarisigadam'),
      ('srikakulam', 'ichapuram', 'ichchapuram'),
      ('srikakulam', 'kotturu', 'kothuru'),
      ('srikakulam', 'laskshminarsupeta', 'lakshminarsupeta'),
      ('srikakulam', 'melipautti', 'meliaputti'),
      ('srikakulam', 'ranasthalam', 'ranastalam'),
      ('srikakulam', 'vajrapukotturu', 'vajrapukothuru'),
      ('visakhapatnam', 'anakapalli', 'anakapalle'),
      ('visakhapatnam', 'arakuvalley', 'araku-valley'),
      ('visakhapatnam', 'chinthapalli', 'chintapalle'),
      ('visakhapatnam', 'devarapalli', 'devarapalle'),
      ('visakhapatnam', 'gk-veedhi', 'gudem-kotha-veedhi'),
      ('visakhapatnam', 'munchingiputtu', 'munchingi-puttu'),
      ('visakhapatnam', 'nakkapalli', 'nakkapalle'),
      ('visakhapatnam', 'pedabayalu', 'peda-bayalu'),
      ('visakhapatnam', 'v-madugula', 'madugula'),
      ('visakhapatnam', 'yellamanchili', 'yelamanchili'),
      ('vizianagaram', 'bondapalli', 'bondapalle'),
      ('vizianagaram', 'cheepurupalli', 'cheepurupalle'),
      ('vizianagaram', 'g-l-puram', 'gummalakshmipuram'),
      ('west-godavari', 'devarapalli', 'devarapalle'),
      ('west-godavari', 'elamanchili', 'yelamanchili'),
      ('west-godavari', 'jeelugumilli', 'jeelugu-milli'),
      ('west-godavari', 'kamavarapu-kota', 'kamavarapukota'),
      ('west-godavari', 'palakoderu', 'palacoderu'),
      ('west-godavari', 'velairpad', 'velairpadu'),
      ('ysr-kadapa', 'atloor', 'atlur'),
      ('ysr-kadapa', 'b-mattam', 'brahmamgarimattam'),
      ('ysr-kadapa', 'c-k-dinne', 'chinthakommadinne'),
      ('ysr-kadapa', 'chakrayapeta', 'chakrayapet'),
      ('ysr-kadapa', 'chapadu', 'chapad'),
      ('ysr-kadapa', 'lakkireddi-palli', 'lakkireddipalle'),
      ('ysr-kadapa', 'muddanuru', 'muddanur'),
      ('ysr-kadapa', 'mydukur', 's-mydukur'),
      ('ysr-kadapa', 'obulavaripalli', 'obulavaripalle'),
      ('ysr-kadapa', 'pulivendula', 'pulivendla'),
      ('ysr-kadapa', 'rayachoty', 'rayachoti'),
      ('ysr-kadapa', 'rly-kodur', 'kodur'),
      ('ysr-kadapa', 'sambepalli', 'sambepalle'),
      ('ysr-kadapa', 't-sundupalli', 't-sundupalle'),
      ('ysr-kadapa', 'v-n-palli', 'veerapunayunipalle'),
      ('ysr-kadapa', 'veeraballi', 'veeraballe'),
      ('ysr-kadapa', 'vempalli', 'vempalle')
  ), matched_mandals AS (
    SELECT a.district_slug, a.alias, a.canonical, min(rep.mandal) AS official_name
    FROM aliases a
    JOIN public.representatives rep
      ON rep.district_slug = a.district_slug AND rep.mandal_slug = a.canonical
    WHERE rep.state_code = 'AP' AND rep.election_year = 2021 AND rep.source_type = 'sec'
      AND rep.data_status = 'verified' AND rep.office_type = 'sarpanch'
    GROUP BY a.district_slug, a.alias, a.canonical
  )
  UPDATE public.representatives rep
  SET mandal_slug = matched.canonical, mandal = coalesce(matched.official_name, rep.mandal)
  FROM matched_mandals matched
  WHERE rep.state_code = 'AP' AND rep.election_year = 2021 AND rep.source_type = 'sec'
    AND rep.data_status = 'verified' AND rep.office_type IN ('mptc_member', 'zptc_member')
    AND rep.district_slug = matched.district_slug AND rep.mandal_slug = matched.alias;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_ap_2021_election_directory() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_ap_2021_election_directory() TO service_role;

SELECT public.normalize_ap_2021_election_directory();

COMMIT;
