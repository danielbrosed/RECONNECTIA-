"use client";

import { useEffect, useState } from "react";
import { PROVINCES } from "@/lib/geo";
import { municipiosDe } from "@/lib/municipios";
import { estadoUbicacion } from "@/lib/provincia-ciudad";

// Selector de ubicación en dos pasos: provincia y municipio. Las provincias son
// las canónicas de lib/geo (las mismas que usa el cálculo de afinidad) y los
// municipios salen del catálogo del INE, que se carga por provincia bajo demanda
// (lib/municipios): la página no arrastra los 8.000 de golpe.
//
// Sirve para los tres casos del producto:
//   · Empresa: guarda provincia y ciudad en campos separados (region / city).
//   · Alumno: guarda un solo campo de texto ("Bilbao, Bizkaia") vía combinedName,
//     formato que resolveProvince de lib/geo sigue resolviendo sin cambios.
//   · Formador: solo provincia (soloProvincia). Guarda el nombre canónico, el
//     mismo con el que se calcula la distancia a las formaciones.
//
// LOTE03 (L3-06, causa C): lo guardado se ve y viaja tal cual aunque no esté en
// la lista (una provincia antigua, un municipio fuera del catálogo o mientras
// el catálogo carga): antes el selector salía vacío y el autoguardado lo
// tomaba por un cambio y lo borraba. Mientras el municipio está desactivado
// (cargando), su valor viaja en un campo oculto. Lo decide estadoUbicacion
// (lib/provincia-ciudad.ts), con sus pruebas.

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
  /** Solo el desplegable de provincia, sin municipio (perfil del formador). */
  soloProvincia?: boolean;
  /** Texto de la opción vacía de provincia. */
  placeholderProvince?: string;
  /**
   * Aviso de cada cambio, para los formularios que no envían campos por name
   * sino que llaman a una acción con los valores (el centro de trabajo del
   * alumno, el alta de centros en administración). Al cambiar de provincia el
   * municipio se vacía y se avisa con city "".
   */
  onChange?: (valor: { province: string; city: string }) => void;
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
  soloProvincia = false,
  placeholderProvince = "Elegir provincia",
  onChange,
}: Props) {
  const [province, setProvince] = useState(defaultProvince);
  const [city, setCity] = useState(defaultCity);
  const [municipios, setMunicipios] = useState<readonly string[]>([]);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!province || soloProvincia) {
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
  }, [province, soloProvincia]);

  // Un valor guardado antes de existir este selector puede no estar en el
  // catálogo. En vez de perderlo en silencio, se ofrece como opción propia.
  // LOTE03 (L3-06): también mientras carga el catálogo o si no se ha podido cargar.
  const {
    municipioPropio: fueraDeCatalogo,
    provinciaPropia: provinciaFuera,
    municipioDesactivado: ciudadDesactivada,
    municipioOculto,
    combinado,
  } = estadoUbicacion({ province, city, municipios, cargando, conCampoMunicipio: !!cityName });

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
            onChange?.({ province: e.target.value, city: "" });
          }}
        >
          <option value="">{placeholderProvince}</option>
          {provinciaFuera && <option value={province}>{province}</option>}
          {PROVINCES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {!soloProvincia && (
        <div>
          <label htmlFor={`${idPrefix}-ciudad`} className="label-field">
            {labelCity}
          </label>
          <select
            id={`${idPrefix}-ciudad`}
            name={cityName}
            className="input-field"
            disabled={ciudadDesactivada}
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              onChange?.({ province, city: e.target.value });
            }}
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
          {/* Desactivado (cargando o sin provincia), el desplegable no viaja: su valor sí (sin contar como cambio para el aviso). */}
          {municipioOculto && <input type="hidden" name={cityName} value={city} data-sin-aviso />}
        </div>
      )}

      {combinedName && <input type="hidden" name={combinedName} value={combinado} />}
    </>
  );
}
