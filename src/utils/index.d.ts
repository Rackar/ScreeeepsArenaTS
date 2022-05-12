interface Pos {
  x: number;
  y: number;
}

// 如果需要覆盖原生 Creep 接口
declare module "game/prototypes" {
  interface Creep {
    moveTarge?: RoomPosition;
  }
}
