export const AVATARS = [
  { id: 'sun', name: '阳光黄', bg: '#FFC93C', fg: '#1F2A44' },
  { id: 'coral', name: '珊瑚橙', bg: '#FF7A45', fg: '#1F2A44' },
  { id: 'mint', name: '薄荷绿', bg: '#34C38F', fg: '#1F2A44' },
  { id: 'blue', name: '天空蓝', bg: '#2167D8', fg: '#FFFFFF' },
  { id: 'purple', name: '葡萄紫', bg: '#8B6CFF', fg: '#FFFFFF' },
  { id: 'peach', name: '蜜桃粉', bg: '#FFE6D3', fg: '#1F2A44' },
];

export function avatarById(id: string) {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}

/** 圆形头像：头像颜色 + 昵称的第一个字 */
export default function Avatar({ avatar, name, size = 44 }: { avatar: string; name: string; size?: number }) {
  const a = avatarById(avatar);
  return (
    <span className="avatar" aria-hidden="true" style={{ width: size, height: size, background: a.bg, color: a.fg, fontSize: size * 0.5 }}>
      {[...name.trim()][0] ?? '?'}
    </span>
  );
}
