/**
 * 存储抽象层（Repo 接口）—— spec §3 架构铁律。
 * UI 只依赖这六个接口；Dexie（Web）与 SQLite（原生）差异被隔离在实现层。
 */
import type {
  FoodEntry,
  FoodLibrary,
  GoalVersion,
  Measurement,
  MeasurementType,
  MealSlot,
  Profile,
} from './types'

/** 通用生成：所有记录带 UUID + 时间戳（未来云同步预留） */
export interface NewRecordMeta {
  id?: string
  createdAt?: string
}

export interface ProfileRepo {
  /** 单例读取；首次使用返回 null（进入 onboarding） */
  get(): Promise<Profile | null>
  save(profile: Profile): Promise<void>
}

export interface GoalRepo {
  /** 有且仅有一个开放版本（closedOn 为空）；无目标时返回 null */
  getOpen(): Promise<GoalVersion | null>
  /** 历史版本（含已封存），按创建时间倒序 */
  listAll(): Promise<GoalVersion[]>
  /**
   * 保存新目标 = 封存当前开放版本（记录封存日）+ 生效新版本。
   * 调用方须先通过 checkGoal 三态校验。
   */
  openNew(goal: Omit<GoalVersion, 'id' | 'closedOn' | 'createdAt'> & Partial<Pick<GoalVersion, 'id'>>): Promise<GoalVersion>
}

export interface FoodLibraryRepo {
  get(id: string): Promise<FoodLibrary | undefined>
  /** 关键字/拼音搜索名称与别名，常用条目置顶 */
  search(query: string, limit?: number): Promise<FoodLibrary[]>
  /** 新增自定义食物（与内置库同构） */
  add(food: Omit<FoodLibrary, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<FoodLibrary, 'id'>>): Promise<FoodLibrary>
  update(food: FoodLibrary): Promise<void>
  remove(id: string): Promise<void>
  count(): Promise<number>
}

export interface FoodLogRepo {
  /** 某日全部条目（按 createdAt 升序） */
  listByDate(date: string): Promise<FoodEntry[]>
  /** 某日某餐槽条目 */
  listBySlot(date: string, slot: MealSlot): Promise<FoodEntry[]>
  /** 本餐会话：暂存区一次性入账（多条同事务写入） */
  addMany(entries: Array<Omit<FoodEntry, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<FoodEntry, 'id' | 'createdAt'>>>): Promise<FoodEntry[]>
  update(entry: FoodEntry): Promise<void>
  remove(id: string): Promise<void>
  /** 全部条目数（设置页存储诊断用） */
  count(): Promise<number>
}

export interface MeasurementRepo {
  /** 某日某类型全部原始记录（同日多条合法） */
  listByDateAndType(date: string, type: MeasurementType): Promise<Measurement[]>
  /** 某类型按日期升序的全部记录（曲线用） */
  listByType(type: MeasurementType): Promise<Measurement[]>
  /** 打卡/补录一条（不拦截同日多条） */
  add(m: Omit<Measurement, 'id' | 'createdAt'> & Partial<Pick<Measurement, 'id' | 'createdAt'>>): Promise<Measurement>
  remove(id: string): Promise<void>
  /** 某类型某日均值；无记录返回 undefined */
  dailyMean(type: MeasurementType, date: string): Promise<number | undefined>
  /** 全部测量记录数（设置页存储诊断用） */
  count(): Promise<number>
}

export interface SettingRepo {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
}

/** 六接口聚合 —— 实现层（Dexie / capacitor-sqlite）各自工厂产出 */
export interface Repos {
  profile: ProfileRepo
  goal: GoalRepo
  foodLibrary: FoodLibraryRepo
  foodLog: FoodLogRepo
  measurement: MeasurementRepo
  setting: SettingRepo
}
