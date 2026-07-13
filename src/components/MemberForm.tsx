'use client'

import { useRef, useState } from 'react'
import { FamilyMember, Gender, DatePrecision } from '@/types'
import { toFullDate, toInputValue } from '@/utils/datePrecision'
import PhotoCropModal from './PhotoCropModal'
import PrecisionDateInput from './PrecisionDateInput'

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
      alert('苗字と名前を入力してください')
      return
    }

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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 md:p-6">
      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
            苗字 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            placeholder="山田"
            className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
            名前 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            placeholder="太郎"
            className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
          />
        </div>
      </div>

      {/* Gender */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
          性別
        </label>
        <select
          name="gender"
          value={formData.gender}
          onChange={handleInputChange}
          className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
        >
          <option value="male">男性</option>
          <option value="female">女性</option>
          <option value="other">その他</option>
        </select>
      </div>

      {/* Birth Date */}
      <PrecisionDateInput
        label="生年月日"
        precision={birthDatePrecision}
        value={birthDateInput}
        onPrecisionChange={handleBirthPrecisionChange}
        onValueChange={setBirthDateInput}
      />

      {/* Death Date */}
      <PrecisionDateInput
        label="没年月日"
        precision={deathDatePrecision}
        value={deathDateInput}
        onPrecisionChange={handleDeathPrecisionChange}
        onValueChange={setDeathDateInput}
      />

      {/* Photo */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
          写真
        </label>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="block w-full text-sm text-gray-500 file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-3 md:file:px-4 file:rounded-lg file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        {photoPreview && (
          <div className="mt-3 flex items-center gap-3">
            <img
              src={photoPreview}
              alt="Preview"
              className="h-20 w-20 md:h-32 md:w-32 object-cover rounded-lg"
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleRecrop}
                className="px-3 py-1 text-xs md:text-sm bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition"
              >
                トリミングし直す
              </button>
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="px-3 py-1 text-xs md:text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
              >
                写真を削除
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
          メモ
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleInputChange}
          placeholder="その他の情報を入力..."
          rows={3}
          className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
        />
      </div>

      {/* Submit Button */}
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 bg-indigo-600 text-white py-2 md:py-3 rounded-lg hover:bg-indigo-700 transition font-medium text-sm md:text-base"
        >
          {isEditing ? '更新' : '追加'}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 md:px-6 py-2 md:py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition font-medium text-sm md:text-base"
          >
            キャンセル
          </button>
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
