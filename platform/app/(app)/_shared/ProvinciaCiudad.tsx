"use client";

import { useEffect, useState } from "react";
import { PROVINCES } from "@/lib/geo";
import { municipiosDe } from "@/lib/municipios";

// Selector de ubicación en dos pasos: provincia y municipio. Las provincias son
// las canónicas de lib/geo (las mismas que usa el cálculo de afinidad) y los
// municipios salen del catálogo del INE, que se carga por provincia bajo demanda
// (lib/municipios): la página no arrastra los 8.000 de golpe.
//
// Sirve para los dos casos del producto:
//   · Empresa: guarda provincia y ciudad en campos separados (region / city).
//   · Alumno: guarda un solo campo de texto ("Bilbao, Bizkaia") vía combinedName,
//     formato que resolveProvince de lib/geo sigue resolviendo sin cambios.

type Props = {
  /** name del campo de provincia. Si se omite, la provincia no se envía suelta. */
  provinceName?: string;
  /** name del campo de municipio. Si se omite, el municipio no se envía suelto. */
  cityName?: string;
  /** name de un campo oculto con "Municipio, Provincia" (o solo la provincia). */
  combinedName?: string;
  defaultProvince?: string;
  defaultCity?: string;
  labelProvince?: string;
  labelCity?: string;
  /** Prefijo de los id, necesario si hay dos selectores en la misma página. */
  idPrefix?: string;
  requiredProvince?: boolean;
};

export default function ProvinciaCiudad({
  provinceName,
  cityName,
  combinedName,
  defaultProvince = "",
  defaultCity = "",
  labelProvince = "Provincia",
  labelCity = "Ciudad",
  idPrefix = "ubicacion",
  requiredProvince = false,
}: Props) {
  const [province, setProvince] = useState(defaultProvince);
  const [city, setCity] = useState(defaultCity);
  const [municipios, setMunicipios] = useState<readonly string[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!province) {
      setMunicipios([]);
      return;
    }
    // El usuario puede cambiar de provincia mientras el chunk anterior sigue en
    // vuelo: el flag descarta la respuesta que llega tarde.
    let vigente = true;
    setCargando(true);
    municipiosDe(province)
      .then((lista) => {
        if (!vigente) return;
        setMunicipios(lista);
      })
      .catch(() => {
        if (!vigente) return;
        setMunicipios([]);
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [province]);

  // Un valor guardado antes de existir este selector puede no estar en el
  // catálogo. En vez de perderlo en silencio, se ofrece como opción propia.
  const fueraDeCatalogo = city !== "" && municipios.length > 0 && !municipios.includes(city);
  const combinado = city ? `${city}, ${province}` : province;

  return (
    <>
      <div>
        <label htmlFor={`${idPrefix}-provincia`} className="label-field">
          {labelProvince}
        </label>
        <select
          id={`${idPrefix}-provincia`}
          name={provinceName}
          className="input-field"
          required={requiredProvince}
          value={province}
          onChange={(e) => {
            setProvince(e.target.value);
            setCity("");
          }}
        >
          <option value="">Elegir provincia</option>
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${idPrefix}-ciudad`} className="label-field">
          {labelCity}
        </label>
        <select
          id={`${idPrefix}-ciudad`}
          name={cityName}
          className="input-field"
          disabled={!province || cargando}
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">
            {!province
              ? "Elige antes la provincia"
              : cargando
                ? "Cargando municipios"
                : "Elegir municipio"}
          </option>
          {fueraDeCatalogo && <option value={city}>{city}</option>}
          {municipios.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      {combinedName && <input type="hidden" name={combinedName} value={combinado} />}
    </>
  );
}
