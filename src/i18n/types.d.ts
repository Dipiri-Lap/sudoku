import 'i18next';
import type { resources } from './index';

// t('...') 키를 ko json 기준으로 타입 검사한다.
declare module 'i18next' {
    interface CustomTypeOptions {
        defaultNS: 'common';
        resources: (typeof resources)['ko'];
        returnNull: false;
    }
}
