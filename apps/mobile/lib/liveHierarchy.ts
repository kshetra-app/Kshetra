import type { SubConstituencyHierarchyDTO } from '@kshetra/shared';

type HierarchyWard =
  | SubConstituencyHierarchyDTO['urbanLocalBodies'][number]['wards'][number]
  | SubConstituencyHierarchyDTO['gramPanchayats'][number]['wards'][number];

export type HierarchyBody =
  | {
      kind: 'ulb';
      key: string;
      id: string;
      internalId: string;
      name: string;
      localName?: string;
      wards: HierarchyWard[];
    }
  | {
      kind: 'gram_panchayat';
      key: string;
      id: string;
      internalId: string;
      name: string;
      localName?: string;
      wards: HierarchyWard[];
    };

export function getHierarchyBodies(data: SubConstituencyHierarchyDTO): HierarchyBody[] {
  const urban = data.urbanLocalBodies.map((body) => ({
    kind: 'ulb' as const,
    key: `ulb:${body.id}`,
    id: body.id,
    internalId: body.internalId,
    name: body.name,
    localName: body.localName,
    wards: body.wards,
  }));
  const rural = data.gramPanchayats.map((body) => ({
    kind: 'gram_panchayat' as const,
    key: `gp:${body.id}`,
    id: body.id,
    internalId: body.internalId,
    name: body.name,
    localName: body.localName,
    wards: body.wards,
  }));

  return [...urban, ...rural].sort((left, right) => left.name.localeCompare(right.name));
}

function bodyIds(body: HierarchyBody): Set<string> {
  return new Set([body.id, body.internalId]);
}

function wardIds(body: HierarchyBody): Set<string> {
  return new Set(body.wards.flatMap((ward) => [ward.id, ward.internalId]));
}

function isBoothForBody(
  booth: SubConstituencyHierarchyDTO['pollingBooths'][number],
  body: HierarchyBody,
  knownWardIds: Set<string>,
): boolean {
  if (body.kind === 'ulb') {
    return booth.localBodyType === 'ulb' && !!booth.ulbWardId && knownWardIds.has(booth.ulbWardId);
  }

  if (booth.localBodyType !== 'gram_panchayat') return false;
  const hasPanchayatLink = !!booth.panchayatId;
  const hasWardLink = !!booth.gpWardId;
  const panchayatMatches = hasPanchayatLink && bodyIds(body).has(booth.panchayatId!);
  const wardMatches = hasWardLink && knownWardIds.has(booth.gpWardId!);

  // When both persisted links exist they must resolve to the same body.
  if (hasPanchayatLink && hasWardLink) return panchayatMatches && wardMatches;
  return panchayatMatches || wardMatches;
}

export function getBoothsForHierarchyBody(
  data: SubConstituencyHierarchyDTO,
  body: HierarchyBody,
) {
  const knownWardIds = wardIds(body);
  return data.pollingBooths.filter((booth) => isBoothForBody(booth, body, knownWardIds));
}

export function getBoothsForHierarchyWard(
  data: SubConstituencyHierarchyDTO,
  body: HierarchyBody,
  ward: HierarchyWard,
) {
  const ids = new Set([ward.id, ward.internalId]);
  return data.pollingBooths.filter((booth) => {
    if (body.kind === 'ulb') {
      return booth.localBodyType === 'ulb' && !!booth.ulbWardId && ids.has(booth.ulbWardId);
    }
    return booth.localBodyType === 'gram_panchayat' && !!booth.gpWardId && ids.has(booth.gpWardId);
  });
}

export function getBoothsWithoutHierarchyWard(
  data: SubConstituencyHierarchyDTO,
  body: HierarchyBody,
) {
  const wardIdsForBody = wardIds(body);
  return getBoothsForHierarchyBody(data, body).filter((booth) => {
    const wardId = body.kind === 'ulb' ? booth.ulbWardId : booth.gpWardId;
    return !wardId || !wardIdsForBody.has(wardId);
  });
}

export function getBoothsWithoutHierarchyBody(data: SubConstituencyHierarchyDTO) {
  const assignedBoothIds = new Set(
    getHierarchyBodies(data).flatMap((body) =>
      getBoothsForHierarchyBody(data, body).map((booth) => booth.id),
    ),
  );
  return data.pollingBooths.filter((booth) => !assignedBoothIds.has(booth.id));
}
