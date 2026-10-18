/** Product pages live in the operator workspace and, for catalogue admins, under the vessel in the catalogue. */
export function productPaths(orgId: string | null, vesselId: string) {
  const cabins = orgId ? `/dashboard/operator/${orgId}/cabins/${vesselId}/` : `/dashboard/admin/catalogue/${vesselId}/cabins/`;
  const schedules = orgId
    ? `/dashboard/operator/${orgId}/schedules/${vesselId}/`
    : `/dashboard/admin/catalogue/${vesselId}/schedules/`;
  const promotions = orgId
    ? `/dashboard/operator/${orgId}/promotions/${vesselId}/`
    : `/dashboard/admin/catalogue/${vesselId}/promotions/`;
  return {
    cabins,
    cabin: (id: string) => `${cabins}${id}/`,
    schedules,
    schedule: (id: string) => `${schedules}${id}/`,
    departure: (scheduleId: string, id: string) => `${schedules}${scheduleId}/${id}/`,
    promotions,
    promotion: (id: string) => `${promotions}${id}/`,
    back: orgId ? `/dashboard/operator/${orgId}/` : `/dashboard/admin/catalogue/${vesselId}/`,
  };
}
