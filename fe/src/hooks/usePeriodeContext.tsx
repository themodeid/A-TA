"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Periode } from "@/types";
import { getAllPeriode } from "@/features/periode/api/periode.api";

interface PeriodeContextValue {
  periodeList: Periode[];
  selectedPeriode: Periode | null;
  selectedPeriodeId: number | null;
  setSelectedPeriodeId: (id: number) => void;
  refreshPeriodeList: () => Promise<void>;
  isLoading: boolean;
}

const PeriodeContext = createContext<PeriodeContextValue | null>(null);

export function PeriodeProvider({ children }: { children: React.ReactNode }) {
  const [periodeList, setPeriodeList] = useState<Periode[]>([]);
  const [selectedPeriodeId, setSelectedPeriodeIdState] = useState<
    number | null
  >(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPeriodeList = useCallback(async () => {
    try {
      const data = await getAllPeriode();
      setPeriodeList(data);
      if (data.length > 0) {
        setSelectedPeriodeIdState((prev) => {
          if (prev && data.some((p) => p.id_periode === prev)) return prev;
          const active =
            data.find((p) => p.status !== "Selesai") ?? data[0];
          return active.id_periode;
        });
      }
    } catch {
      setPeriodeList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPeriodeList();
  }, [refreshPeriodeList]);

  const setSelectedPeriodeId = useCallback((id: number) => {
    setSelectedPeriodeIdState(id);
  }, []);

  const selectedPeriode =
    periodeList.find((p) => p.id_periode === selectedPeriodeId) ?? null;

  return (
    <PeriodeContext.Provider
      value={{
        periodeList,
        selectedPeriode,
        selectedPeriodeId,
        setSelectedPeriodeId,
        refreshPeriodeList,
        isLoading,
      }}
    >
      {children}
    </PeriodeContext.Provider>
  );
}

export function usePeriode() {
  const ctx = useContext(PeriodeContext);
  if (!ctx) throw new Error("usePeriode must be used within PeriodeProvider");
  return ctx;
}
