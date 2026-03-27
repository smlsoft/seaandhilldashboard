# Register Debezium Connector for 6 Branches
# Usage: ./register_connectors.ps1

$DEBEZIUM_HOST = "http://localhost:8083"
$PG_HOST = "147.50.69.68"
$PG_PORT = "54322"
$PG_USER = "postgres"
$PG_PASSWORD = "seaandhill"

# List of databases and their branch codes
$databases = @(
    @{ Code = "000"; Name = "changsiamcompany_2568"; Host = $PG_HOST; Port = $PG_PORT },
    @{ Code = "001"; Name = "changsiamruay_2568"; Host = $PG_HOST; Port = $PG_PORT },
    @{ Code = "002"; Name = "changsupthawee_2568"; Host = $PG_HOST; Port = $PG_PORT },
    @{ Code = "003"; Name = "chaothalayheha_2568"; Host = $PG_HOST; Port = $PG_PORT },
    @{ Code = "004"; Name = "deejingjung_2568"; Host = $PG_HOST; Port = $PG_PORT },
    @{ Code = "005"; Name = "homhug_2568"; Host = $PG_HOST; Port = $PG_PORT },
    # Test Database
    @{ Code = "test"; Name = "data1"; Host = "localhost"; Port = "5432" }
)

foreach ($db in $databases) {
    $connectorName = "connector-branch-$($db.Code)"
    $dbHost = if ($db.Host) { $db.Host } else { $PG_HOST }
    $port = if ($db.Port) { $db.Port } else { $PG_PORT }
    
    $config = @{
        "name"   = $connectorName
        "config" = @{
            "connector.class"   = "io.debezium.connector.postgresql.PostgresConnector"
            "database.hostname" = $dbHost
            "database.port"     = $port
            "database.user"     = $PG_USER
            "database.password" = $PG_PASSWORD
            "database.dbname"   = $db.Name
            
            # Topic Prefix: branch_000, branch_001, etc.
            "topic.prefix"      = "branch_$($db.Code)"
            
            "plugin.name"       = "pgoutput"
            "slot.name"         = "debezium_slot_$($db.Code)"
            
            # รวมเฉพาะ tables ที่จำเป็น (ใส่ * ถ้าเอาหมด)
            #"table.include.list" = "public.journal_transaction_detail,public.payment_transaction"
        }
    }

    $json = $config | ConvertTo-Json -Depth 5

    Write-Host "Registering connector: $connectorName for DB: $($db.Name)..."
    try {
        $response = Invoke-RestMethod -Uri "$DEBEZIUM_HOST/connectors" -Method Post -Body $json -ContentType "application/json"
        Write-Host "✅ Success: $($response.name)"
    }
    catch {
        Write-Host "⚠️ Failed/Already Exists: $($_.Exception.Message)"
    }
}
