import { useState, useRef } from 'react'
import { Stage, Layer, Circle, Arrow, Line, Text, Group } from 'react-konva'

export default function DrillDesigner({ initialData, onChange }) {
  // Si hay datos guardados, los cargamos. Si no, empezamos vacío.
  const [items, setItems] = useState(initialData?.items || [])
  const [tool, setTool] = useState('cone') // 'cone', 'player', 'arrow', 'erase'
  
  const stageRef = useRef(null)
  const isDrawing = useRef(false)
  const currentArrow = useRef(null)

  // Función para guardar los cambios hacia el componente padre
  const saveChanges = (newItems) => {
    setItems(newItems)
    onChange({ items: newItems })
  }

  // Click en el lienzo
  const handleStageClick = (e) => {
    // Si no es click directo en el fondo, ignoramos (para no dibujar encima de un cono)
    if (e.target !== e.target.getStage()) return

    const stage = e.target.getStage()
    const pointerPosition = stage.getPointerPosition()
    
    // Coordenadas relativas (ajustadas a la escala)
    const x = (pointerPosition.x - stage.x()) / stage.scaleX()
    const y = (pointerPosition.y - stage.y()) / stage.scaleY()

    if (tool === 'cone') {
      saveChanges([...items, { id: Date.now(), type: 'cone', x, y }])
    } else if (tool === 'player') {
      saveChanges([...items, { id: Date.now(), type: 'player', x, y, label: 'J' }])
    }
  }

  // Arrastrar elementos (conos, jugadores, flechas)
  const handleDragEnd = (e, id) => {
    const newItems = items.map(item => {
      if (item.id === id) {
        return { ...item, x: e.target.x(), y: e.target.y() }
      }
      return item
    })
    saveChanges(newItems)
  }

  // Borrar elemento con doble click o click derecho
  const handleErase = (id) => {
    if (tool === 'erase') {
      saveChanges(items.filter(item => item.id !== id))
    }
  }

  // --- Lógica para dibujar flechas (arrastrar) ---
  const handleMouseDown = (e) => {
    if (tool !== 'arrow') return
    if (e.target !== e.target.getStage()) return
    isDrawing.current = true
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    const x = (pos.x - stage.x()) / stage.scaleX()
    const y = (pos.y - stage.y()) / stage.scaleY()
    
    currentArrow.current = { id: Date.now(), type: 'arrow', points: [x, y, x, y] }
    setItems([...items, currentArrow.current])
  }

  const handleMouseMove = (e) => {
    if (!isDrawing.current || tool !== 'arrow') return
    const stage = e.target.getStage()
    const pos = stage.getPointerPosition()
    const x = (pos.x - stage.x()) / stage.scaleX()
    const y = (pos.y - stage.y()) / stage.scaleY()

    const newItems = items.map(item => {
      if (item.id === currentArrow.current.id) {
        return { ...item, points: [item.points[0], item.points[1], x, y] }
      }
      return item
    })
    setItems(newItems)
  }

  const handleMouseUp = () => {
    if (tool === 'arrow' && isDrawing.current) {
      isDrawing.current = false
      onChange({ items })
    }
  }

  return (
    <div className="space-y-2">
      {/* Barra de Herramientas */}
      <div className="flex flex-wrap gap-1 bg-slate-800 p-2 rounded-t-lg border border-slate-700">
        <button onClick={() => setTool('cone')} className={`px-3 py-1 text-xs rounded ${tool === 'cone' ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🔶 Cono</button>
        <button onClick={() => setTool('player')} className={`px-3 py-1 text-xs rounded ${tool === 'player' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🏃 Jugador</button>
        <button onClick={() => setTool('arrow')} className={`px-3 py-1 text-xs rounded ${tool === 'arrow' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300'}`}>➡️ Ruta</button>
        <button onClick={() => setTool('erase')} className={`px-3 py-1 text-xs rounded ${tool === 'erase' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-slate-300'}`}>🗑️ Borrar</button>
        <button onClick={() => { if(confirm('¿Limpiar todo el dibujo?')) saveChanges([]) }} className="px-3 py-1 text-xs rounded bg-slate-900 text-rose-400 ml-auto">Limpiar</button>
      </div>

      {/* Lienzo */}
      <div className="bg-slate-900 border-x border-b border-slate-700 rounded-b-lg overflow-hidden flex justify-center">
        <Stage 
          width={400} 
          height={300} 
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleStageClick}
          className="cursor-crosshair"
        >
          <Layer>
            {/* Fondo de la cancha (Líneas simples) */}
            <Line points={[0, 150, 400, 150]} stroke="#334155" strokeWidth={2} dash={[10, 5]} />
            <Text text="MEDIA CANCHA" x={10} y={10} fontSize={12} fill="#475569" />
            <Text text="END ZONE" x={150} y={270} fontSize={12} fill="#475569" />

            {/* Renderizado de elementos */}
            {items.map((item) => {
              if (item.type === 'cone') {
                return (
                  <Circle
                    key={item.id}
                    x={item.x} y={item.y} radius={8}
                    fill="#ea580c" stroke="#c2410c" strokeWidth={2}
                    draggable={tool === 'erase' ? false : true}
                    onDragEnd={(e) => handleDragEnd(e, item.id)}
                    onClick={() => handleErase(item.id)}
                  />
                )
              }
              if (item.type === 'player') {
                return (
                  <Group
                    key={item.id}
                    x={item.x} y={item.y}
                    draggable={tool === 'erase' ? false : true}
                    onDragEnd={(e) => handleDragEnd(e, item.id)}
                    onClick={() => handleErase(item.id)}
                  >
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
                    onClick={() => handleErase(item.id)}
                  />
                )
              }
              return null
            })}
          </Layer>
        </Stage>
      </div>
      <p className="text-[10px] text-slate-500 text-center">Elegí una herramienta arriba, hacé click en la cancha para agregar, o arrastrá para dibujar rutas.</p>
    </div>
  )
}