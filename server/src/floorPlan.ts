// Builds a simple floor plan for a case: the crime scene plus every alibi room,
// arranged along a corridor (or in a row, for a train), with walking times.

export interface PlanRoom {
  /** Index into the case's room list: 0 is the crime scene, 1.. are the theme's alibi places */
  idx: number;
  x: number;
  y: number;
  w: number;
  h: number;
  door: { x: number; y: number };
  /** Minutes on foot to the crime scene */
  walk: number;
}

export interface Plan {
  layout: 'corridor' | 'linear';
  width: number;
  height: number;
  rooms: PlanRoom[];
  corridor: { x: number; y: number; w: number; h: number } | null;
}

interface Rng {
  int(min: number, max: number): number;
  shuffle<T>(arr: T[]): T[];
}

const ROOM_H = 5;
const CORRIDOR_H = 2;
const CAR_W = 7;
const CAR_H = 3.5;

export function generatePlan(rng: Rng, roomCount: number, layout: 'corridor' | 'linear'): Plan {
  if (layout === 'linear') {
    // A train: cars in a row, the crime scene somewhere in the middle third.
    const order = rng.shuffle(Array.from({ length: roomCount }, (_, i) => i).filter(i => i !== 0));
    const scenePos = rng.int(1, Math.max(1, roomCount - 2));
    order.splice(scenePos, 0, 0);
    const rooms = order.map((idx, pos) => ({
      idx,
      x: pos * (CAR_W + 0.6),
      y: 0,
      w: CAR_W,
      h: CAR_H,
      door: { x: pos * (CAR_W + 0.6) + CAR_W / 2, y: CAR_H / 2 },
      walk: 0,
    }));
    for (const r of rooms) r.walk = Math.abs(order.indexOf(r.idx) - scenePos) * 2 + (r.idx === 0 ? 0 : 1);
    return { layout, width: rooms.length * (CAR_W + 0.6) - 0.6, height: CAR_H, rooms: rooms.sort((a, b) => a.idx - b.idx), corridor: null };
  }

  // A building: rooms above and below a corridor, the crime scene at one end.
  const others = rng.shuffle(Array.from({ length: roomCount - 1 }, (_, i) => i + 1));
  const top = [0, ...others.slice(0, Math.ceil(others.length / 2))];
  const bottom = others.slice(Math.ceil(others.length / 2));
  const place = (row: number[], y: number, doorY: number) => {
    let x = 0;
    return row.map(idx => {
      const w = rng.int(4, 6);
      const room: PlanRoom = { idx, x, y, w, h: ROOM_H, door: { x: x + w / 2, y: doorY }, walk: 0 };
      x += w;
      return room;
    });
  };
  const topRooms = place(top, 0, ROOM_H);
  const bottomRooms = place(bottom, ROOM_H + CORRIDOR_H, ROOM_H + CORRIDOR_H);
  const width = Math.max(...[...topRooms, ...bottomRooms].map(r => r.x + r.w));
  const rooms = [...topRooms, ...bottomRooms];
  const scene = rooms.find(r => r.idx === 0)!;
  for (const r of rooms) {
    if (r.idx === 0) continue;
    // Along the corridor at a brisk walk, plus a minute to get through the doors.
    r.walk = 1 + Math.max(1, Math.round(Math.abs(r.door.x - scene.door.x) / 2.5));
  }
  return {
    layout,
    width,
    height: ROOM_H * 2 + CORRIDOR_H,
    rooms: rooms.sort((a, b) => a.idx - b.idx),
    corridor: { x: 0, y: ROOM_H, w: width, h: CORRIDOR_H },
  };
}
