// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react'
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
const 写真つき: FamilyMember = {
  id: 'withphoto',
  lastName: '宮本',
  firstName: '太郎',
  gender: 'male',
  photo: 'data:image/png;base64,iVBORw0KGgo=',
  createdAt: 4,
}
const 写真つき2: FamilyMember = {
  id: 'withphoto2',
  lastName: '宮本',
  firstName: '次郎',
  gender: 'male',
  photo: 'data:image/png;base64,iVBORw0KGgo=',
  createdAt: 5,
}
const third: FamilyMember = {
  id: 'other',
  lastName: '宮本',
  firstName: '太郎',
  gender: 'male',
  createdAt: 3,
}

const members = [ヤスヱ, ユキミ, third, 写真つき, 写真つき2]
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

  it('写真を押すと拡大表示が開く', () => {
    setup(写真つき)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: '宮本 太郎の写真を拡大する' }))

    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-label')).toBe('宮本 太郎の写真')
    // パネル自体にも「閉じる」があるので、拡大表示の中に絞って押す
    fireEvent.click(within(dialog).getByRole('button', { name: '閉じる' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('写真が無い人は押せる要素にしない', () => {
    setup(ヤスヱ)
    expect(screen.queryByRole('button', { name: /写真を拡大する/ })).toBeNull()
  })

  it('拡大表示中に別の人へ切り替わったら閉じる', () => {
    // 切り替え先も写真を持っている場合、閉じ忘れると
    // 前の人の写真を見ていたつもりが別人の写真に差し替わる
    const { props, view } = setup(写真つき)
    fireEvent.click(screen.getByRole('button', { name: '宮本 太郎の写真を拡大する' }))
    expect(screen.getByRole('dialog')).toBeTruthy()

    view.rerender(<MemberDetailPanel {...props} member={写真つき2} />)
    expect(screen.queryByRole('dialog')).toBeNull()
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
