// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import MemberDetailPanel from './MemberDetailPanel'
import { FamilyMember, Marriage, ParentChildRelation } from '@/types'

afterEach(cleanup)

const ヤスヱ: FamilyMember = {
  id: 'yasue',
  lastName: '宮本',
  firstName: 'ヤスヱ',
  gender: 'female',
  birthDate: '1926-11-15',
  createdAt: 1,
}
const ユキミ: FamilyMember = {
  id: 'yukimi',
  lastName: '花咲',
  firstName: 'ユキミ',
  gender: 'female',
  deathDate: '2016-11-20',
  createdAt: 2,
}
const third: FamilyMember = {
  id: 'other',
  lastName: '宮本',
  firstName: '太郎',
  gender: 'male',
  createdAt: 3,
}

const members = [ヤスヱ, ユキミ, third]
const marriages: Marriage[] = []
const relations: ParentChildRelation[] = []

type Props = React.ComponentProps<typeof MemberDetailPanel>

function setup(member: FamilyMember) {
  const props: Props = {
    member,
    members,
    marriages,
    parentChildRelations: relations,
    isSelf: false,
    onClose: vi.fn(),
    onSelectMember: vi.fn(),
    onUpdateMember: vi.fn(),
    onDeleteMember: vi.fn(),
    onSetSelf: vi.fn(),
    onAddMarriage: vi.fn(),
    onRemoveMarriage: vi.fn(),
    onAddParentChild: vi.fn(),
    onRemoveParentChild: vi.fn(),
    onRequestDelete: vi.fn(),
  }
  const view = render(<MemberDetailPanel {...props} />)
  return { props, view }
}

// 本番で1人ぶんの氏名・生没年・写真が失われた不具合の再発防止。
// 編集中に家系図の別のノードをクリックすると member だけが差し替わるため、
// フォームに前の人の内容が残ったまま「更新」が押せてしまっていた。
describe('MemberDetailPanel', () => {
  it('編集中に別の人へ切り替わったら編集モードを抜ける', () => {
    const { props, view } = setup(ユキミ)
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    expect(screen.getByDisplayValue('ユキミ')).toBeTruthy()

    // 家系図で別のノードをクリックした状況
    view.rerender(<MemberDetailPanel {...props} member={ヤスヱ} />)

    // 編集フォームは閉じ、詳細表示に戻っていること
    expect(screen.queryByRole('button', { name: '更新' })).toBeNull()
    expect(screen.getByText('宮本 ヤスヱ')).toBeTruthy()
    expect(props.onUpdateMember).not.toHaveBeenCalled()
  })

  it('切り替え後に編集を開くと、その人自身の値が入っている', () => {
    // 前の人の値が残っていると、更新した瞬間に別人の内容で上書きされる
    const { props, view } = setup(ユキミ)
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    view.rerender(<MemberDetailPanel {...props} member={ヤスヱ} />)
    fireEvent.click(screen.getByRole('button', { name: '編集' }))

    expect(screen.getByDisplayValue('ヤスヱ')).toBeTruthy()
    expect(screen.queryByDisplayValue('ユキミ')).toBeNull()
    expect(screen.getByDisplayValue('1926-11-15')).toBeTruthy()
  })

  it('編集の開始・終了を呼び出し側へ知らせる（この間ノード選択を止めるため）', () => {
    const onEditingChange = vi.fn()
    const { props } = setup(ヤスヱ)
    cleanup()
    render(<MemberDetailPanel {...props} onEditingChange={onEditingChange} />)

    expect(onEditingChange).toHaveBeenLastCalledWith(false)

    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    expect(onEditingChange).toHaveBeenLastCalledWith(true)

    fireEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(onEditingChange).toHaveBeenLastCalledWith(false)
  })

  it('パネルを閉じたときも編集中を解除する（ノード選択が止まったままにならない）', () => {
    const onEditingChange = vi.fn()
    const { props } = setup(ヤスヱ)
    cleanup()
    const view = render(<MemberDetailPanel {...props} onEditingChange={onEditingChange} />)
    fireEvent.click(screen.getByRole('button', { name: '編集' }))
    expect(onEditingChange).toHaveBeenLastCalledWith(true)

    view.unmount()
    expect(onEditingChange).toHaveBeenLastCalledWith(false)
  })

  it('関係の追加フォームも、人が切り替わったら閉じる', () => {
    // 開いたままだと、前の人向けに選んだ相手が新しい人の関係として登録される
    const { props, view } = setup(ユキミ)
    fireEvent.click(screen.getAllByRole('button', { name: '追加' })[0])
    expect(screen.getByLabelText('配偶者を追加')).toBeTruthy()

    view.rerender(<MemberDetailPanel {...props} member={ヤスヱ} />)

    expect(screen.queryByLabelText('配偶者を追加')).toBeNull()
    expect(props.onAddMarriage).not.toHaveBeenCalled()
  })
})
