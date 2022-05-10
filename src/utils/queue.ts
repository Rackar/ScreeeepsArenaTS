import { getRange } from "game";
import { Creep } from "game/prototypes";

// 覆盖Creep 类型对象
declare module "game/prototypes" {
  interface Creep {
    importQueue: () => void;
  }
}
// or other exorts

// 我们可以使用
// import MyLib, {A} from 'my-lib'
// const lib = new MyLib()
// const a = new A()

// interface Creep {
//   importQueue(item: IQueueItem): void;
//   runQueue(): void;
// }

// 队列类型： moveToPosByRange moveToUnitByRange
