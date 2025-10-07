/**
 * Shared Naver Maps loader (supports lazy submodule injection e.g. geocoder)
 */

let baseLoadingPromise: Promise<any> | null = null;
let geocoderLoadingPromise: Promise<any> | null = null;

interface LoadOptions {
    submodules?: string[]; // e.g. ['geocoder']
    force?: boolean; // force reload (debug)
}

function injectScript(params: Record<string, string>): Promise<any> {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        const usp = new URLSearchParams(params);
        script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?${usp.toString()}`;
        script.async = true;
        script.onload = () => resolve((window as any).naver);
        script.onerror = () =>
            reject(new Error("Naver Maps 스크립트 로드 실패"));
        document.head.appendChild(script);
    });
}

export function loadNaverMaps(
    options: LoadOptions = {}
): Promise<typeof window & { naver: any }> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("SSR 환경에서는 사용할 수 없습니다."));
    }
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    if (!clientId) {
        return Promise.reject(
            new Error("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID 미설정")
        );
    }

    const needGeocoder = options.submodules?.includes("geocoder");
    const w: any = window as any;

    // Already loaded?
    if (w.naver?.maps) {
        if (needGeocoder && !w.naver.maps.Service?.geocode) {
            // Geocoder missing: inject submodule script once
            if (!geocoderLoadingPromise) {
                geocoderLoadingPromise = new Promise((resolve, reject) => {
                    injectScript({
                        ncpClientId: clientId,
                        submodules: "geocoder",
                        cacheBust: Date.now().toString(),
                    })
                        .then(() => {
                            // Wait a short loop for Service availability
                            const start = performance.now();
                            const check = () => {
                                if (w.naver?.maps?.Service?.geocode) {
                                    resolve(w);
                                    return;
                                }
                                if (performance.now() - start > 5000) {
                                    reject(
                                        new Error(
                                            "geocoder 서브모듈 로드 타임아웃"
                                        )
                                    );
                                    return;
                                }
                                requestAnimationFrame(check);
                            };
                            check();
                        })
                        .catch(reject);
                });
            }
            return geocoderLoadingPromise;
        }
        return Promise.resolve(w);
    }

    // Base not loaded yet
    if (!baseLoadingPromise || options.force) {
        baseLoadingPromise = new Promise((resolve, reject) => {
            const params: Record<string, string> = { ncpClientId: clientId };
            if (needGeocoder) params.submodules = "geocoder";
            injectScript(params)
                .then(() => {
                    if (w.naver?.maps) {
                        resolve(w);
                    } else {
                        reject(new Error("Naver Maps 전역 객체 미생성"));
                    }
                })
                .catch(reject);
        });
    }
    return baseLoadingPromise;
}
