import { useEffect, useState } from 'react';
import { Button, Input, Select, message } from 'antd';
import { useTranslation } from 'react-i18next';

import * as api from '@/api/hid.ts';

interface UsbIdentity {
  vid: string;
  pid: string;
  manufacturer: string;
  product: string;
}

const presets = [
  { value: 'custom', vid: '', pid: '', manufacturer: '', product: '' },
  { value: 'default', vid: '0x3346', pid: '0x1009', manufacturer: 'sipeed', product: 'NanoKVM' },
  { value: 'logitech', vid: '0x046d', pid: '0xc31c', manufacturer: 'Logitech', product: 'Keyboard K120' },
  { value: 'microsoft', vid: '0x045e', pid: '0x00db', manufacturer: 'Microsoft', product: 'Natural Ergonomic Keyboard' },
  { value: 'generic', vid: '0x1d6b', pid: '0x0104', manufacturer: 'Linux Foundation', product: 'Multifunction Composite Gadget' }
];

export const UsbIdentity = () => {
  const { t } = useTranslation();

  const [identity, setIdentity] = useState<UsbIdentity>({
    vid: '0x3346',
    pid: '0x1009',
    manufacturer: 'sipeed',
    product: 'NanoKVM'
  });
  const [preset, setPreset] = useState('default');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadIdentity();
  }, []);

  function loadIdentity() {
    setIsLoading(true);

    api
      .getUsbIdentity()
      .then((rsp: any) => {
        if (rsp.code !== 0) {
          console.log(rsp.msg);
          return;
        }

        const data = rsp.data as UsbIdentity;
        setIdentity(data);
        detectPreset(data);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }

  function detectPreset(data: UsbIdentity) {
    const found = presets.find(
      (p) =>
        p.vid === data.vid &&
        p.pid === data.pid &&
        p.manufacturer === data.manufacturer &&
        p.product === data.product
    );
    setPreset(found ? found.value : 'custom');
  }

  function handlePresetChange(value: string) {
    setPreset(value);
    if (value !== 'custom') {
      const selected = presets.find((p) => p.value === value);
      if (selected) {
        setIdentity({
          vid: selected.vid,
          pid: selected.pid,
          manufacturer: selected.manufacturer,
          product: selected.product
        });
      }
    }
  }

  function handleSave() {
    if (isSaving) return;
    setIsSaving(true);

    api
      .setUsbIdentity(identity.vid, identity.pid, identity.manufacturer, identity.product)
      .then((rsp: any) => {
        if (rsp.code !== 0) {
          message.error(rsp.msg || t('settings.device.usbIdentity.saveFailed'));
          return;
        }
        message.success(t('settings.device.usbIdentity.saveSuccess'));
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  const presetOptions = [
    { value: 'custom', label: t('settings.device.usbIdentity.custom') },
    { value: 'default', label: 'NanoKVM' },
    { value: 'logitech', label: 'Logitech Keyboard' },
    { value: 'microsoft', label: 'Microsoft Keyboard' },
    { value: 'generic', label: 'Generic HID' }
  ];

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-col space-y-1">
        <span>{t('settings.device.usbIdentity.title')}</span>
        <span className="text-xs text-neutral-500">
          {t('settings.device.usbIdentity.description')}
        </span>
      </div>

      <div className="flex flex-col space-y-3 rounded-lg bg-neutral-700/30 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm">{t('settings.device.usbIdentity.preset')}</span>
          <Select
            style={{ width: 200 }}
            value={preset}
            options={presetOptions}
            loading={isLoading}
            onChange={handlePresetChange}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">{t('settings.device.usbIdentity.vid')}</span>
          <Input
            style={{ width: 200 }}
            value={identity.vid}
            placeholder="0x046d"
            onChange={(e) => {
              setIdentity({ ...identity, vid: e.target.value });
              setPreset('custom');
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">{t('settings.device.usbIdentity.pid')}</span>
          <Input
            style={{ width: 200 }}
            value={identity.pid}
            placeholder="0xc31c"
            onChange={(e) => {
              setIdentity({ ...identity, pid: e.target.value });
              setPreset('custom');
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">{t('settings.device.usbIdentity.manufacturer')}</span>
          <Input
            style={{ width: 200 }}
            value={identity.manufacturer}
            placeholder="Logitech"
            onChange={(e) => {
              setIdentity({ ...identity, manufacturer: e.target.value });
              setPreset('custom');
            }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">{t('settings.device.usbIdentity.product')}</span>
          <Input
            style={{ width: 200 }}
            value={identity.product}
            placeholder="Keyboard K120"
            onChange={(e) => {
              setIdentity({ ...identity, product: e.target.value });
              setPreset('custom');
            }}
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-amber-500">
            {t('settings.device.usbIdentity.rebootRequired')}
          </span>
          <Button type="primary" loading={isSaving} onClick={handleSave}>
            {t('settings.device.usbIdentity.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
