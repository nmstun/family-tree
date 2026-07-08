'use client'

import { useRef, useState } from 'react'
import { FamilyMember, Gender } from '@/types'

interface MemberFormProps {
  onSubmit: (member: Omit<FamilyMember, 'id' | 'createdAt'>) => void
}

export default function MemberForm({ onSubmit }: MemberFormProps) {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    gender: 'male' as Gender,
    birthDate: '',
    deathDate: '',
    notes: '',
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const lastNameImnputRef = useRef<HTMLInputElement>(null)

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
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
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
      birthDate: formData.birthDate || undefined,
      deathDate: formData.deathDate || undefined,
      photo: photoPreview || undefined,
      notes: formData.notes || undefined,
    })

    // Reset form
    setFormData({
      lastName: '',
      firstName: '',
      gender: 'male',
      birthDate: '',
      deathDate: '',
      notes: '',
    })
    setPhotoPreview(null)
    // ブラウザは Enter キーでの送信時に送信ボタンへフォーカスを移すことがあるため、
    // その処理が終わった後に確実に反映されるよう1ティック遅らせて実行する
    setTimeout(() => {
      lastNameInputRef.current?.focus()
    }, 0)
  }

  return (
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
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
          生年月日
        </label>
        <input
          type="date"
          name="birthDate"
          value={formData.birthDate}
          onChange={handleInputChange}
          className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
        />
      </div>

      {/* Death Date */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
          没年月日
        </label>
        <input
          type="date"
          name="deathDate"
          value={formData.deathDate}
          onChange={handleInputChange}
          className="w-full px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm md:text-base"
        />
      </div>

      {/* Photo */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1 md:mb-2">
          写真
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="block w-full text-sm text-gray-500 file:mr-2 md:file:mr-4 file:py-1 md:file:py-2 file:px-3 md:file:px-4 file:rounded-lg file:border-0 file:text-xs md:file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
        />
        {photoPreview && (
          <div className="mt-3 relative inline-block">
            <img
              src={photoPreview}
              alt="Preview"
              className="h-20 w-20 md:h-32 md:w-32 object-cover rounded-lg"
            />
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
      <button
        type="submit"
        className="w-full bg-indigo-600 text-white py-2 md:py-3 rounded-lg hover:bg-indigo-700 transition font-medium text-sm md:text-base"
      >
        追加
      </button>
    </form>
  )
}
