<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
    ];

    public static function get($key, $default = null)
    {
        $setting = self::where('key', $key)->first();

        if (! $setting) {
            return $default;
        }

        return self::castValue($setting->value, $setting->type);
    }

    public static function set($key, $value, $type = 'string', $description = null)
    {
        return self::updateOrCreate(
            ['key' => $key],
            [
                'value' => is_array($value) || is_object($value) ? json_encode($value) : $value,
                'type' => $type,
                'description' => $description,
            ]
        );
    }

    public static function getBoolean($key, $default = false)
    {
        return (bool) self::get($key, $default);
    }

    public static function getInteger($key, $default = 0)
    {
        return (int) self::get($key, $default);
    }

    public static function getJson($key, $default = [])
    {
        $value = self::get($key, $default);

        return is_string($value) ? json_decode($value, true) : $value;
    }

    protected static function castValue($value, $type)
    {
        switch ($type) {
            case 'boolean':
                return filter_var($value, FILTER_VALIDATE_BOOLEAN);
            case 'integer':
                return (int) $value;
            case 'json':
                return json_decode($value, true);
            default:
                return $value;
        }
    }

    public function getValueAttribute($value)
    {
        return self::castValue($value, $this->type);
    }
}
