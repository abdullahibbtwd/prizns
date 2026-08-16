import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CmsModal } from '@/cms/components/CmsModal'
import { GhostButton, PrimaryButton } from '@/cms/components/CmsUI'
import { cn } from '@/lib/utils'

export type CmsConfirmVariant = 'danger' | 'default'

export type CmsConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: CmsConfirmVariant
}

type CmsConfirmDialogProps = CmsConfirmOptions & {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  pending?: boolean
}

export function CmsConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  pending = false,
}: CmsConfirmDialogProps) {
  const { t } = useTranslation()
  const confirmText =
    confirmLabel ??
    (variant === 'danger' ? t('cms.common.delete') : t('cms.common.confirm'))
  const cancelText = cancelLabel ?? t('cms.common.cancel')

  return (
    <CmsModal open={open} onClose={onClose} title={title} size="sm">
      {description ? (
        <p className="text-sm leading-relaxed text-stone-600">{description}</p>
      ) : null}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <GhostButton type="button" onClick={onClose} disabled={pending}>
          {cancelText}
        </GhostButton>
        <PrimaryButton
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={cn(
            variant === 'danger' &&
              'bg-rose-700 shadow-rose-700/20 hover:bg-rose-800 hover:shadow-rose-700/30',
          )}
        >
          {confirmText}
        </PrimaryButton>
      </div>
    </CmsModal>
  )
}

export function useCmsConfirm() {
  const { t } = useTranslation()
  const resolverRef = useRef<((ok: boolean) => void) | null>(null)
  const [options, setOptions] = useState<CmsConfirmOptions | null>(null)

  const close = useCallback((ok: boolean) => {
    resolverRef.current?.(ok)
    resolverRef.current = null
    setOptions(null)
  }, [])

  const confirm = useCallback((next: CmsConfirmOptions) => {
    resolverRef.current?.(false)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
      setOptions(next)
    })
  }, [])

  useEffect(
    () => () => {
      resolverRef.current?.(false)
      resolverRef.current = null
    },
    [],
  )

  const dialog = (
    <CmsConfirmDialog
      open={options !== null}
      title={options?.title ?? ''}
      description={options?.description}
      confirmLabel={
        options?.confirmLabel ??
        (options?.variant === 'default'
          ? t('cms.common.confirm')
          : t('cms.common.delete'))
      }
      cancelLabel={options?.cancelLabel ?? t('cms.common.cancel')}
      variant={options?.variant ?? 'danger'}
      onClose={() => close(false)}
      onConfirm={() => close(true)}
    />
  )

  return { confirm, dialog }
}
