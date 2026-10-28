# Archive: Mobile Bundled Assets (V1 Legacy Snapshot)

## 1. Overview & Provenance
- **Archive Date:** October 28, 2026
- **Baseline Git Commit:** `9804d14`
- **Source Paths:** `apps/mobile/data/` & `apps/mobile/android/app/src/main/assets/`
- **Archive Authority:** CTO DIRECTIVE 154 / Master Execution Framework Amendment v1.6 / Launch Gate A Performance Specification

## 2. Decoupling Rationale
Prior to this archival, the mobile client repository embedded:
1. `seed-data.db` (137,732,096 bytes / ~137.7 MB) containing 224,780 local-body representative records directly into the mobile package and Android APK assets.
2. 31 state-level Assembly Constituency GeoJSON files (`*-assembly.json` totaling 64,455,338 bytes / ~64.5 MB) inside `apps/mobile/data/`, in addition to inlining `telangana-assembly.json` (3.76 MB) directly into the JS bundle via `geoLoader.ts`.

These monolithic assets inflated the client application by over 200 MB, threatening the Launch Gate A consumer mobile binary budget ($\le 25\text{–}30\text{ MB}$ APK target).

## 3. Re-architected Client Delivery Model
1. **On-Demand Boundary Streaming (`remoteGeoLoader.ts`)**:
   State-level GeoJSON polygons are streamed on demand from the Fastify API Gateway (`apps/api/public/geo/` served gzipped with SHA-1 cache-busting versions) and cached locally on-device in `FileSystem.cacheDirectory/geo/`. Only the lightweight national overview (`india-states.json`, ~0.5 MB) remains bundled for immediate offline first paint.
2. **Lean Device SQLite Engine (`seedDataLoader.ts`)**:
   The on-device SQLite database schema is initialized dynamically via DDL upon first launch (costing 0 bytes in asset bundle weight). Representative profiles and local-body governance data are fetched and synchronized on-demand via the API Gateway.
3. **Full Zero-Fabrication Preservation**:
   All 224,780 local-body representative records and 31 state GeoJSON datasets are fully preserved in this archive and available in the PostgreSQL staging/production datasets and Fastify static CDN.

## 4. Cryptographic Manifest (SHA-256)

### Database Assets (`db/`)
| File | Bytes | SHA-256 Digest |
| :--- | :--- | :--- |
| `seed-data.db` | 137,732,096 | `A2D827430D816FFE69E940EC463717019CBD4B362212128F7604DDD2576CF7E8` |
| `seed-db-version.json` | 81 | `D8F08627FC893D4BF546408B1BC8FB183873EA6D17E27CBFF4E6049482FB2E52` |
| `seed-manifest.json` | 8,837 | `B6D0DD64C506173933F5DBC60E4C6FAB61EEC0EAEC14296023707ACE48769004` |

### GeoJSON Assets (`geo/`)
Total Uncompressed Size: 64,455,338 bytes across 31 assembly files + `india-states.json` + `geo-manifest.json`.

| File | Bytes | SHA-256 Digest |
| :--- | :--- | :--- |
| `ap-assembly.json` | 859,778 | `96D986D81B6B97AE869DC6893B0E0AF17D40C846ABE484DF0D081A8095A6A857` |
| `ar-assembly.json` | 625,188 | `2E8EA91BEA1E338115AFA12472CC891F30DA90656F3DE796C818DED8E284E18F` |
| `as-assembly.json` | 1,127,651 | `F730B4735B86D0F64BB01A7464337A0B0A16E2A37C5070505528F7076FA0CFBA` |
| `br-assembly.json` | 4,513,109 | `FE8EAA3ADDAE732D6993FEA394F4C800FF06236C64042D0F0F63FE2894B52257` |
| `cg-assembly.json` | 1,846,546 | `0F23565F9D34A14401FA6C0801C37D46E046038CECAF16AA389CF08B3130DB28` |
| `dl-assembly.json` | 102,256 | `8E3B828328FD331BD44E6D9FAAC6620C4F805DD8F2E510699DDE765C37BCCC20` |
| `ga-assembly.json` | 124,837 | `F6D92304F30A54A79FB56B00E0468BD2FD8EA06D044BC4B382F5846B26C51F31` |
| `geo-manifest.json` | 5,610 | `D6631691445769A420F82CAD5C40DDAFE884F57C6816475F335950A8E24DEFE6` |
| `gj-assembly.json` | 4,565,521 | `7EE91B32418A6B18683976823D6DE9E2ED4D4995F5BCF3F6906075B2370C4148` |
| `hp-assembly.json` | 1,316,619 | `C36A7FD091928C1A46404CCD11441D7CB2D4858ED8ADF508E38992557DFCF4CC` |
| `hr-assembly.json` | 926,162 | `BA7B49149D693B5E7E9ADAF2CFABF1A642875E7E2524AFFA8594A50D87B70F02` |
| `india-states.json` | 1,024,198 | `C7BF2EE6414795A3930EBAECE0B44500AA73BE5536924C1278DA43097C4B762F` |
| `jh-assembly.json` | 1,188,148 | `98C554DE1C1958F4870F81FC11B2768A07A22C91393D87245E21C9D1E80BF38C` |
| `jk-assembly.json` | 330,675 | `F6B1D713EE0C33D2504731E666EFEABBE7B85E5A95D247772F40B9278434AAA6` |
| `ka-assembly.json` | 4,796,396 | `4A21D49FE5632F214C5CCD07895357CB3B5D9DE35AE5087C12D015FCB000033E` |
| `kl-assembly.json` | 1,687,038 | `DA1BC45DAA45458D26F925C6612BED160C17A61308BC7BA5C0EB8D401716621B` |
| `mh-assembly.json` | 3,841,762 | `DA84B42A0648CD3C1AB23296A2514EBD4F7D782676B8169D90065EC0A12A5E23` |
| `ml-assembly.json` | 431,259 | `3090233F8209B2F4E5C2CE4CB19B4DD89B212980ACDD542ACB72C4505D397C11` |
| `mn-assembly.json` | 992,884 | `F0D571CCCAF36A29402AF03C63E0502C38476C1043F83F54BA6249978D369096` |
| `mp-assembly.json` | 5,011,521 | `E54B9C7555FDD792336D62460524090C5500FB11B14D67E467B046E194BACAB4` |
| `mz-assembly.json` | 403,168 | `9A96FB725CC84F73C00B0158B049236280A629C006F94EB5304139A2CA469B34` |
| `nl-assembly.json` | 679,774 | `DD4244E114ACCB78B02099EA67D09009B59C202993CD58E5D09A29AF8986B55D` |
| `od-assembly.json` | 3,677,886 | `C1BCCD65A6A668095E8894F96A8741DDA8683F5A1708FE7998D723CF9B58D6EC` |
| `pb-assembly.json` | 1,842,869 | `CB6A50B686E881AB04103A9361293EE62B7C2C0EB5BEAFA702495A30F8E35E1E` |
| `py-assembly.json` | 118,230 | `1F6A7109836604CACB0447005434B48748C810D4C51F129B282ABB001E6B9051` |
| `rj-assembly.json` | 3,532,974 | `D59802383F22ECB1D449B7BD41B53EAFD76FD2523864163998AAFDD4CA9D5E57` |
| `sk-assembly.json` | 135,893 | `4D96A5398B306D94989B4B601864163686B5F5F87960F6482E4F303328BFCCA6` |
| `telangana-assembly.json` | 3,762,805 | `ED72CDE6A1943184DF07ACFC92A266C35F3E83C699D9649F31E796372585CFC5` |
| `tn-assembly.json` | 3,694,219 | `5A1AEF525DA1A6B65D674456F9D9300818B898F58DF873773E314DD46170E489` |
| `tr-assembly.json` | 439,942 | `129839B8E561F2CE41D729A83F99F39BA1E20BE7347453158288590847BC1F7C` |
| `uk-assembly.json` | 1,468,320 | `9D2AE23FACBAF7731C67937F936BFDCEFADC3C696BDD06C658C4F3F5034539EB` |
| `up-assembly.json` | 6,978,407 | `4356BA9AEE09A9774B12B9C98F248598F0306D288F6F2DD35F37C111DEEE73B1` |
| `wb-assembly.json` | 3,433,501 | `AC542BE0E1D64D7C036639025BA39FE77ED6728082FAE7F75FB90222786A21A2` |

### Affidavits Assets (`affidavits/`)
| File | Bytes | SHA-256 Digest |
| :--- | :--- | :--- |
| `candidate-affidavits.json` | 1,829,905 | `0EAD96CA0D66DC95E9D95CD27D91317CD662F0CD0668DA5BAF7EAD1513098990` |
| `candidate-photo-map.json` | 494,559 | `65A4F1EF4F2C00C0D7D518B647F70A32D1445E107CDBB5F9F026278FF93556E1` |
| `legislator-profiles.json` | 3 | `37517E5F3DC66819F61F5A7BB8ACE1921282415F10551D2DEFA5C3EB0985B570` |
