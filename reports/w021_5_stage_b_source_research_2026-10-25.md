# W021.5 Stage B Source Research

Status: PARTIAL — NOT ACCEPTED.

Official sources located:
- ECI 2008 delimitation order: https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008%28English%29.pdf
- ECI delimitation source index: https://www.eci.gov.in/delimitation/
- Survey of India administrative boundary products: https://onlinemaps.surveyofindia.gov.in/Digital_Products.aspx
- Survey of India boundary database details: https://onlinemaps.surveyofindia.gov.in/AboutPortal.aspx
- ECI statistical reports: https://www.eci.gov.in/statistical-reports

The ECI digital order is an official textual/legal source, but it is not a complete national vector polygon package and does not satisfy the physical-Gazette inspection requirement. Survey of India lists administrative boundaries to state/district/sub-district/village levels, not a verified assembly-constituency polygon layer. These sources can support reconciliation but do not close W021.5-B1-04 or EB-01..EB-05 by themselves.

Third-party candidates reviewed:
- https://github.com/datameet/maps/tree/master/assembly-constituencies — community data with documented spatial shifts, naming problems and state-boundary inconsistencies; reference only.
- https://github.com/skthewimp/india-constituency-maps — README and manifest report 4,119 post-2008 AC features across 30 jurisdictions, Gujarat at 181/182, no Assam 2023 assembly polygons, old Assam/J&K layers in the general post-2008 layer, and incomplete J&K northern geometry. Reference only; not official or complete.

The GitHub API provided blob IDs, not artifact SHA-256. Binary source downloads were unavailable in this runtime, so no byte-level SHA-256 or binary acquisition is claimed. No polygons were fabricated; no database was accessed. EB-01 physical custody, EB-02 independent physical transcription audit, EB-03 official India Post beat polygons, EB-04 containment against those polygons, EB-05 verified all-state polling-station/PIN crosswalk, and W021.5-B1-04 remain open.
