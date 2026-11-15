import { Stage, Layer, Circle, Arrow, Line, Text, Group } from 'react-konva'

export default function DrillViewer({ data }) {
  if (!data || !data.items || data.items.length === 0) return null

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex justify-center my-2">
      <Stage width={400} height={300}>
        <Layer>
          {/* Fondo de la cancha (igual que en el editor) */}
          <Line points={[0, 150, 400, 150]} stroke="#334155" strokeWidth={2} dash={[10, 5]} />
          <Text text="MEDIA CANCHA" x={10} y={10} fontSize={12} fill="#475569" />
          
          {/* Renderizado de los elementos (sin interactividad) */}
          {data.items.map((item) => {
            if (item.type === 'cone') {
              return (
                <Circle
                  key={item.id}
                  x={item.x} y={item.y} radius={8}
                  fill="#ea580c" stroke="#c2410c" strokeWidth={2}
                />
              )
            }
            if (item.type === 'player') {
              return (
                <Group key={item.id} x={item.x} y={item.y}>
                  <Circle radius={12} fill="#2563eb" stroke="#1d4ed8" strokeWidth={2} />
                  <Text text="J" x={-4} y={-6} fontSize={14} fill="white" fontStyle="bold" />
                </Group>
              )
            }
            if (item.type === 'arrow') {
              return (
                <Arrow
                  key={item.id}
                  points={item.points}
                  stroke="#10b981" strokeWidth={3} fill="#10b981"
                  pointerLength={10} pointerWidth={10}
                />
              )
            }
            return null
          })}
        </Layer>
      </Stage>
    </div>
  )
}