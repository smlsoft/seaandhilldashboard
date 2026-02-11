# Register Debezium Connector for 6 Branches
# Usage: ./register_connectors.ps1

$DEBEZIUM_HOST = "http://localhost:8083"
$PG_HOST = "147.50.69.68"
$PG_PORT = "5432"
$PG_USER = "web_dashboard"
$PG_PASSWORD = "Web2026!"

# List of databases and their branch codes
$databases = @(
    @{ Code = "000"; Name = "changsiamcompany_2568" },
    @{ Code = "001"; Name = "CHANGSIAMRUAY_2568" },
    @{ Code = "002"; Name = "CHANGSUPTHAWEE_2568" },
    @{ Code = "003"; Name = "CHAOTHALAYHEHA_2568" },
    @{ Code = "004"; Name = "DEEJINGJUNG_2568" },
    @{ Code = "005"; Name = "HOMHUG_2568" }
)

foreach ($db in $databases) {
    $connectorName = "connector-branch-$($db.Code)"
    $config = @{
        "name" = $connectorName
        "config" = @{
            "connector.class" = "io.debezium.connector.postgresql.PostgresConnector"
            "database.hostname" = $PG_HOST
            "database.port" = $PG_PORT
            "database.user" = $PG_USER
            "database.password" = $PG_PASSWORD
            "database.dbname" = $db.Name
            
            # Topic Prefix: branch_000, branch_001, etc.
            "topic.prefix" = "branch_$($db.Code)"
            
            "plugin.name" = "pgoutput"
            "slot.name" = "debezium_slot_$($db.Code)"
            
            # รวมเฉพาะ tables ที่จำเป็น (ใส่ * ถ้าเอาหมด)
            #"table.include.list" = "public.journal_transaction_detail,public.payment_transaction"
        }
    }

    $json = $config | ConvertTo-Json -Depth 5

    Write-Host "Registering connector: $connectorName for DB: $($db.Name)..."
    try {
        $response = Invoke-RestMethod -Uri "$DEBEZIUM_HOST/connectors" -Method Post -Body $json -ContentType "application/json"
        Write-Host "✅ Success: $($response.name)"
    } catch {
        Write-Host "⚠️ Failed/Already Exists: $($_.Exception.Message)"
    }
}
