import { useState, type FormEvent } from 'react'
import { Loader2, Siren } from 'lucide-react'
import { toast } from 'sonner'

import { sendBuddyAlert } from '@/services/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RouteContext {
  start: { lat: number; lng: number }
  end: { lat: number; lng: number }
  startLabel: string
  endLabel: string
}

interface BuddyAlertProps {
  routeContext: RouteContext | null
  disabled?: boolean
}

const PH_REGEX = /^\+639\d{9}$/

export default function BuddyAlert({ routeContext, disabled }: BuddyAlertProps) {
  const [open, setOpen] = useState(false)
  const [buddyPhone, setBuddyPhone] = useState('')
  const [userName, setUserName] = useState('')
  const [sending, setSending] = useState(false)

  const handleOpenChange = (next: boolean) => {
    if (sending && !next) return
    setOpen(next)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!userName.trim()) {
      toast.error('Please enter your name')
      return
    }
    if (!buddyPhone.trim()) {
      toast.error('Please enter your buddy phone number')
      return
    }
    const normalized = buddyPhone.replace(/\s/g, '')
    if (!PH_REGEX.test(normalized)) {
      toast.error('Phone must be in format: +639XXXXXXXXX')
      return
    }

    setSending(true)
    try {
      await sendBuddyAlert({
        user_name: userName.trim(),
        current_lat: routeContext?.start?.lat ?? 14.5995,
        current_lng: routeContext?.start?.lng ?? 121.0175,
        current_address: routeContext?.startLabel || 'Metro Manila',
        destination: routeContext?.endLabel || 'Destination',
        buddy_phone: normalized,
      })
      setOpen(false)
      setBuddyPhone('')
      toast.success('Alert sent successfully. Your buddy has been notified.')
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: string } }
        message?: string
      }
      const d = axiosErr.response?.data?.detail
      toast.error(
        'Failed to send alert: ' +
          (typeof d === 'string' ? d : axiosErr.message || 'Please try again.')
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="destructive"
          className="mt-2 w-full"
          disabled={disabled}
          id="buddy-alert-btn"
          aria-label="Send emergency SMS to a buddy with your location"
        >
          <Siren className="size-4" aria-hidden />
          Alert Emergency Buddy
        </Button>
      </DialogTrigger>
      <DialogContent
        onPointerDownOutside={e => sending && e.preventDefault()}
        onEscapeKeyDown={e => sending && e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Send Buddy Alert</DialogTitle>
          <DialogDescription>
            Your buddy will receive an SMS with your start location and destination.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="buddy-name-input">Your name</Label>
            <Input
              id="buddy-name-input"
              placeholder="e.g. Maria Santos"
              value={userName}
              onChange={e => setUserName(e.target.value)}
              autoComplete="name"
              aria-label="Your name"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="buddy-phone-input">Buddy phone (Philippines)</Label>
            <Input
              id="buddy-phone-input"
              type="tel"
              placeholder="+639XXXXXXXXX"
              value={buddyPhone}
              onChange={e => setBuddyPhone(e.target.value)}
              autoComplete="tel"
              aria-label="Buddy phone number"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                'Send alert'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
