'use client'

import { useRef, useState } from 'react'
import { FamilyMember, Gender, DatePrecision } from '@/types'
import { toFullDate, toInputValue } from '@/utils/datePrecision'
import PhotoCropModal from './PhotoCropModal'
import PrecisionDateInput from './PrecisionDateInput'
import { Alert, Button, Field, cardClass, CONTROL_CLASS, LABEL_CLASS } from './ui'

interface MemberFormProps {
  initialMember?: FamilyMember
  onSubmit: (member: Omit<FamilyMember, 'id' | 'createdAt'>) => void
  onCancel?: () => void
}

export default function MemberForm({ initialMember, onSubmit, onCancel }: MemberFormProps) {
  const isEditing = !!initialMember
  const [formData, setFormData] = useState({
    lastName: initialMember?.lastName ?? '',
    firstName: initialMember?.firstName ?? '',
    gender: (initialMember?.gender ?? 'male') as Gender,
    notes: initialMember?.notes ?? '',
  })
  const [birthDatePrecision, setBirthDatePrecision] = useState<DatePrecision>(
    initialMember?.birthDatePrecision ?? 'day'
  )
  const [birthDateInput, setBirthDateInput] = useState(
    initialMember?.birthDate ? toInputValue(initialMember.birthDate, birthDatePrecision) : ''
  )
  const [deathDatePrecision, setDeathDatePrecision] = useState<DatePrecision>(
    initialMember?.deathDatePrecision ?? 'day'
  )
  const [deathDateInput, setDeathDateInput] = useState(
    initialMember?.deathDate ? toInputValue(initialMember.deathDate, deathDatePrecision) : ''
  )
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialMember?.photo ?? null)
  const [cropSource, setCropSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const lastNameInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      setCropSource(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCropComplete = (croppedDataUrl: string) => {
    setPhotoPreview(croppedDataUrl)
    setCropSource(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handleCropCancel = () => {
    setCropSource(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  const handleRecrop = () => {
    if (photoPreview) setCropSource(photoPreview)
  }

  const handleRemovePhoto = () => {
    setPhotoPreview(null)
    if (photoInputRef.current) photoInputRef.current.value = ''
  }

  // 精度を変えたら、現在の入力値を新しい精度の表示形式に変換し直す
  // （年月日→年のみ、のように精度を落とす場合は情報が失われる）
  const handleBirthPrecisionChange = (precision: DatePrecision) => {
    setBirthDatePrecision(precision)
    if (birthDateInput) {
      setBirthDateInput(toInputValue(toFullDate(birthDateInput, birthDatePrecision), precision))
    }
  }

  const handleDeathPrecisionChange = (precision: DatePrecision) => {
    setDeathDatePrecision(precision)
    if (deathDateInput) {
      setDeathDateInput(toInputValue(toFullDate(deathDateInput, deathDatePrecision), precision))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.lastName.trim() || !formData.firstName.trim()) {
      setError('苗字と名前を入力してください')
      lastNameInputRef.current?.focus()
      return
    }
    setError(null)

    onSubmit({
      lastName: formData.lastName,
      firstName: formData.firstName,
      gender: formData.gender,
      // 空文字を undefined に変換すると updateMember 側の「undefined なら更新しない」
      // 判定に引っかかり、編集時に値をクリアできなくなるため、そのまま渡す
      birthDate: toFullDate(birthDateInput, birthDatePrecision),
      birthDatePrecision,
      deathDate: toFullDate(deathDateInput, deathDatePrecision),
      deathDatePrecision,
      photo: photoPreview ?? '',
      notes: formData.notes,
    })

    if (isEditing) return

    // Reset form
    setFormData({
      lastName: '',
      firstName: '',
      gender: 'male',
      notes: '',
    })
    setBirthDatePrecision('day')
    setBirthDateInput('')
    setDeathDatePrecision('day')
    setDeathDateInput('')
    setPhotoPreview(null)
    // ブラウザは Enter キーでの送信時に送信ボタンへフォーカスを移すことがあるため、
    // その処理が終わった後に確実に反映されるよう1ティック遅らせて実行する
    setTimeout(() => {
      lastNameInputRef.current?.focus()
    }, 0)
  }

  return (
    <>
      <form onSubmit={handleSubmit} className={cardClass()}>
        {/* エラーはフォーム先頭に出す。入力し直す対象（苗字）にフォーカスを移すと
            そこまでスクロールするため、メッセージも同じ位置にないと見落とされる */}
        {error && <Alert className="mb-3">{error}</Alert>}

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Field label="苗字" required htmlFor="member-last-name">
            <input
              id="member-last-name"
              ref={lastNameInputRef}
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              placeholder="山田"
              className={CONTROL_CLASS}
            />
          </Field>
          <Field label="名前" required htmlFor="member-first-name">
            <input
              id="member-first-name"
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              placeholder="太郎"
              className={CONTROL_CLASS}
            />
          </Field>
        </div>

        <Field label="性別" htmlFor="member-gender">
          <select
            id="member-gender"
            name="gender"
            value={formData.gender}
            onChange={handleInputChange}
            className={CONTROL_CLASS}
          >
            <option value="male">男性</option>
            <option value="female">女性</option>
            <option value="other">その他</option>
          </select>
        </Field>

        <PrecisionDateInput
          label="生年月日"
          precision={birthDatePrecision}
          value={birthDateInput}
          onPrecisionChange={handleBirthPrecisionChange}
          onValueChange={setBirthDateInput}
        />

        <PrecisionDateInput
          label="没年月日"
          precision={deathDatePrecision}
          value={deathDateInput}
          onPrecisionChange={handleDeathPrecisionChange}
          onValueChange={setDeathDateInput}
        />

        <div className="mb-4">
          <label className={LABEL_CLASS}>写真</label>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="block w-full mt-1 md:mt-2 text-sm text-gray-500 file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-3 md:file:px-4 file:rounded-lg file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {photoPreview && (
            <div className="mt-3 flex items-center gap-3">
              <img
                src={photoPreview}
                alt="選択中の写真のプレビュー"
                className="h-20 w-20 md:h-32 md:w-32 object-cover rounded-lg"
              />
              <div className="flex flex-col gap-2">
                <Button variant="subtle" size="sm" onClick={handleRecrop}>
                  トリミングし直す
                </Button>
                <Button variant="danger" size="sm" onClick={handleRemovePhoto}>
                  写真を削除
                </Button>
              </div>
            </div>
          )}
        </div>

        <Field label="メモ" htmlFor="member-notes" className="mb-6">
          <textarea
            id="member-notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            placeholder="その他の情報を入力..."
            rows={3}
            className={CONTROL_CLASS}
          />
        </Field>

        <div className="flex gap-2">
          <Button type="submit" size="lg" fullWidth>
            {isEditing ? '更新' : '追加'}
          </Button>
          {isEditing && onCancel && (
            <Button type="button" variant="secondary" size="lg" onClick={onCancel}>
              キャンセル
            </Button>
          )}
        </div>
      </form>

      {cropSource && (
        <PhotoCropModal
          imageSrc={cropSource}
          onCancel={handleCropCancel}
          onComplete={handleCropComplete}
        />
      )}
    </>
  )
}
