declare module "game/path-finder" {
  import { DirectionConstant, RoomPosition } from "game";
  // TODO: type this
  export function searchPath(origin: any, goal: any, options: any): any;

  // TODO: type this
  export interface CostMatrix {
    deserialize(data: any): any;
    _bits: Uint8Array;
    set(xx: any, yy: any, val: any): void;
    get(xx: any, yy: any): number;
    clone(): CostMatrix;
    serialize(): any;
  }

  export interface FindPathOpts {
    /**
     * Treat squares with creeps as walkable. Can be useful with too many moving creeps around or in some other cases. The default
     * value is false.
     */
    ignoreCreeps?: boolean;

    /**
     * Treat squares with destructible structures (constructed walls, ramparts, spawns, extensions) as walkable. Use this flag when
     * you need to move through a territory blocked by hostile structures. If a creep with an ATTACK body part steps on such a square,
     * it automatically attacks the structure. The default value is false.
     */
    ignoreDestructibleStructures?: boolean;

    /**
     * Ignore road structures. Enabling this option can speed up the search. The default value is false. This is only used when the
     * new PathFinder is enabled.
     */
    ignoreRoads?: boolean;

    /**
     * You can use this callback to modify a CostMatrix for any room during the search. The callback accepts two arguments, roomName
     * and costMatrix. Use the costMatrix instance to make changes to the positions costs. If you return a new matrix from this callback,
     * it will be used instead of the built-in cached one. This option is only used when the new PathFinder is enabled.
     *
     * @param roomName The name of the room.
     * @param costMatrix The current CostMatrix
     * @returns The new CostMatrix to use
     */
    costCallback?(roomName: string, costMatrix: CostMatrix): void | CostMatrix;

    /**
     * An array of the room's objects or RoomPosition objects which should be treated as walkable tiles during the search. This option
     * cannot be used when the new PathFinder is enabled (use costCallback option instead).
     */
    ignore?: any[] | RoomPosition[];

    /**
     * An array of the room's objects or RoomPosition objects which should be treated as obstacles during the search. This option cannot
     * be used when the new PathFinder is enabled (use costCallback option instead).
     */
    avoid?: any[] | RoomPosition[];

    /**
     * The maximum limit of possible pathfinding operations. You can limit CPU time used for the search based on ratio 1 op ~ 0.001 CPU.
     * The default value is 2000.
     */
    maxOps?: number;

    /**
     * Weight to apply to the heuristic in the A* formula F = G + weight * H. Use this option only if you understand the underlying
     * A* algorithm mechanics! The default value is 1.2.
     */
    heuristicWeight?: number;

    /**
     * If true, the result path will be serialized using Room.serializePath. The default is false.
     */
    serialize?: boolean;

    /**
     * The maximum allowed rooms to search. The default (and maximum) is 16. This is only used when the new PathFinder is enabled.
     */
    maxRooms?: number;

    /**
     * Path to within (range) tiles of target tile. The default is to path to the tile that the target is on (0).
     */
    range?: number;

    /**
     * Cost for walking on plain positions. The default is 1.
     */
    plainCost?: number;

    /**
     * Cost for walking on swamp positions. The default is 5.
     */
    swampCost?: number;
  }

  export interface MoveToOpts extends FindPathOpts {
    /**
     * This option enables reusing the path found along multiple game ticks. It allows to save CPU time, but can result in a slightly
     * slower creep reaction behavior. The path is stored into the creep's memory to the `_move` property. The `reusePath` value defines
     * the amount of ticks which the path should be reused for. The default value is 5. Increase the amount to save more CPU, decrease
     * to make the movement more consistent. Set to 0 if you want to disable path reusing.
     */
    reusePath?: number;

    /**
     * If `reusePath` is enabled and this option is set to true, the path will be stored in memory in the short serialized form using
     * `Room.serializePath`. The default value is true.
     */
    serializeMemory?: boolean;

    /**
     * If this option is set to true, `moveTo` method will return `ERR_NOT_FOUND` if there is no memorized path to reuse. This can
     * significantly save CPU time in some cases. The default value is false.
     */
    noPathFinding?: boolean;

    // /**
    //  * Draw a line along the creep’s path using `RoomVisual.poly`. You can provide either an empty object or custom style parameters.
    //  */
    // visualizePathStyle?: PolyStyle;
  }
  export interface PathStep {
    x: number;
    dx: number;
    y: number;
    dy: number;
    direction: DirectionConstant;
  }
}