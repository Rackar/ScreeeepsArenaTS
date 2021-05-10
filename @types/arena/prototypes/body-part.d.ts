declare module "arena/prototypes" {
  import { BodyPartConstant, RoomObject, _Constructor } from "game";
  export interface BodyPart extends RoomObject {
    readonly prototype: BodyPart;
    /**
     * The type of the body part.
     */
    type: BodyPartConstant;
    /**
     * The number of ticks until this item disappears.
     */
    ticksToDecay: number;
  }

  export const BodyPart: _Constructor<BodyPart>;
}
