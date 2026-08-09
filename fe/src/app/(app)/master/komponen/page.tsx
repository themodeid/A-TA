"use client";

import { useEffect, useState } from "react";
import {
  getTunjanganMaster,
  getPotonganMaster,
} from "@/features/master/api/master.api";
import { MasterPotongan, MasterTunjangan } from "@/types";
import { PageContainer } from "@/components/layout/PageContainer";
import { Card } from "@/components/ui/Card";
import {
  Table,
  TableHead,
  TableHeaderCell,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

export default function MasterKomponenPage() {
  const [tunjangan, setTunjangan] = useState<MasterTunjangan[]>([]);
  const [potongan, setPotongan] = useState<MasterPotongan[]>([]);

  useEffect(() => {
    getTunjanganMaster().then(setTunjangan).catch(() => setTunjangan([]));
    getPotonganMaster().then(setPotongan).catch(() => setPotongan([]));
  }, []);

  return (
    <PageContainer
      title="Master Komponen"
      description="Kelola formula/master tunjangan & potongan"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Master Tunjangan">
          <Table>
            <TableHead>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Nama Tunjangan</TableHeaderCell>
              <TableHeaderCell>Formula</TableHeaderCell>
            </TableHead>
            <TableBody>
              {tunjangan.map((t) => (
                <TableRow key={t.id_tunjangan}>
                  <TableCell>{t.id_tunjangan}</TableCell>
                  <TableCell>{t.nama_tunjangan}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {t.formula ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        <Card title="Master Potongan">
          <Table>
            <TableHead>
              <TableHeaderCell>ID</TableHeaderCell>
              <TableHeaderCell>Nama Potongan</TableHeaderCell>
            </TableHead>
            <TableBody>
              {potongan.map((p) => (
                <TableRow key={p.id_potongan}>
                  <TableCell>{p.id_potongan}</TableCell>
                  <TableCell>{p.nama_potongan}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </PageContainer>
  );
}
