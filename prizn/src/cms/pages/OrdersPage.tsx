import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  CmsCard,
  CmsPageHeader,
  PrimaryButton,
  StatusPill,
} from '@/cms/components/CmsUI'
import {
  listCmsShopOrders,
  shipCmsShopOrder,
  type CmsShopOrder,
} from '@/lib/shop-api'
import { ApiError } from '@/lib/api'

export default function CmsOrdersPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<CmsShopOrder | null>(null)

  const ordersQuery = useQuery({
    queryKey: ['cms-shop-orders'],
    queryFn: () => listCmsShopOrders({ pageSize: 50 }),
  })

  const shipMutation = useMutation({
    mutationFn: (id: string) => shipCmsShopOrder(id),
    onSuccess: async (order) => {
      setSelected(order)
      await queryClient.invalidateQueries({ queryKey: ['cms-shop-orders'] })
    },
  })

  const items = ordersQuery.data?.items ?? []

  return (
    <div>
      <CmsPageHeader
        title={t('cms.shop.ordersTitle')}
        description={t('cms.shop.ordersDesc')}
        badge={t('cms.shop.ordersBadge', { count: ordersQuery.data?.total ?? 0 })}
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <CmsCard className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#E8E4DC] bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-4 py-3">{t('cms.shop.orderId')}</th>
                <th className="px-4 py-3">{t('cms.shop.email')}</th>
                <th className="px-4 py-3">{t('cms.shop.status')}</th>
                <th className="px-4 py-3">{t('cms.shop.total')}</th>
              </tr>
            </thead>
            <tbody>
              {ordersQuery.isLoading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-stone-500">
                    {t('cms.shop.loading')}
                  </td>
                </tr>
              ) : null}
              {!ordersQuery.isLoading && items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-stone-500">
                    {t('cms.shop.noOrders')}
                  </td>
                </tr>
              ) : null}
              {items.map((order) => (
                <tr
                  key={order.id}
                  className="cursor-pointer border-b border-[#E8E4DC]/70 hover:bg-stone-50"
                  onClick={() => setSelected(order)}
                >
                  <td className="px-4 py-3 font-medium">{order.publicId}</td>
                  <td className="px-4 py-3">{order.email || '—'}</td>
                  <td className="px-4 py-3">
                    <StatusPill status={order.status} />
                  </td>
                  <td className="px-4 py-3">
                    {(order.totalCents / 100).toFixed(2)}{' '}
                    {order.currency.toUpperCase()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CmsCard>

        <CmsCard className="p-5">
          {!selected ? (
            <p className="text-sm text-stone-500">{t('cms.shop.selectOrder')}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-[#0C2686]">
                  {selected.publicId}
                </p>
                <h2 className="font-heading text-2xl text-stone-900">
                  {t(`shop.status.${selected.status}`, {
                    defaultValue: selected.status,
                  })}
                </h2>
              </div>
              <p className="text-sm text-stone-700">{selected.email}</p>
              <p className="text-xs uppercase tracking-wider text-stone-500">
                {selected.paymentMethod === 'COD'
                  ? t('cms.shop.paymentCod')
                  : t('cms.shop.paymentCard')}
              </p>
              {selected.estimatedArrival ? (
                <p className="text-sm text-stone-600">
                  {t('cms.shop.estimatedArrival')}: {selected.estimatedArrival}
                </p>
              ) : null}
              <div className="text-sm text-stone-600">
                <p>{selected.shipping.name}</p>
                <p>{selected.shipping.line1}</p>
                {selected.shipping.line2 ? <p>{selected.shipping.line2}</p> : null}
                <p>
                  {[selected.shipping.postal, selected.shipping.city]
                    .filter(Boolean)
                    .join(' ')}
                </p>
                <p>{selected.shipping.country}</p>
                {selected.shipping.phone ? <p>{selected.shipping.phone}</p> : null}
              </div>
              <ul className="space-y-1 text-sm text-stone-700">
                {selected.items.map((item) => (
                  <li key={item.id}>
                    {item.qty}× {item.title}
                  </li>
                ))}
              </ul>
              {selected.status === 'PAID' ? (
                <PrimaryButton
                  type="button"
                  disabled={shipMutation.isPending}
                  onClick={() => shipMutation.mutate(selected.id)}
                >
                  {shipMutation.isPending
                    ? t('cms.shop.shipping')
                    : t('cms.shop.markShipped')}
                </PrimaryButton>
              ) : null}
              {shipMutation.isError ? (
                <p className="text-sm text-rose-700">
                  {(shipMutation.error as ApiError).message}
                </p>
              ) : null}
            </div>
          )}
        </CmsCard>
      </div>
    </div>
  )
}
